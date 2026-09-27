import pool from '../config/db.js';

/**
 * Search and filter bookable services
 * GET /api/services
 */
export const getServices = async (req, res, next) => {
  try {
    const {
      search,
      category,
      skill_id,
      pricing_type,
      min_price,
      max_price,
      mode, // 'online', 'in_person', or 'all'
      page = 1,
      limit = 12
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitVal = parseInt(limit, 10);

    let baseQuery = `
      FROM services svc
      JOIN user_skills us ON svc.user_skill_id = us.id
      JOIN skills s ON us.skill_id = s.id
      JOIN users u ON us.user_id = u.id
      LEFT JOIN bookings b ON b.service_id = svc.id AND b.status = 'completed'
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE svc.is_active = TRUE AND u.status = 'active'
    `;
    const params = [];

    if (search && search.trim()) {
      baseQuery += ' AND (svc.title LIKE ? OR svc.description LIKE ? OR s.name LIKE ? OR u.full_name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (category && category.trim()) {
      baseQuery += ' AND svc.category = ?';
      params.push(category.trim());
    }

    if (skill_id) {
      baseQuery += ' AND s.id = ?';
      params.push(skill_id);
    }

    if (pricing_type) {
      baseQuery += ' AND svc.pricing_type = ?';
      params.push(pricing_type);
    }

    if (min_price) {
      baseQuery += ' AND svc.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      baseQuery += ' AND svc.price <= ?';
      params.push(parseFloat(max_price));
    }

    if (mode === 'online') {
      baseQuery += ' AND svc.online_available = TRUE';
    } else if (mode === 'in_person') {
      baseQuery += ' AND svc.in_person_available = TRUE';
    }

    // Count query
    const [countResult] = await pool.query(`SELECT COUNT(DISTINCT svc.id) as total ${baseQuery}`, params);
    const total = countResult[0].total;

    // Data query
    const selectQuery = `
      SELECT svc.*,
             s.id as skill_id, s.name as skill_name, s.category as skill_category,
             us.proficiency,
             u.id as provider_id, u.username as provider_username, u.full_name as provider_name,
             u.profile_picture as provider_avatar, u.college as provider_college, u.location as provider_location,
             COUNT(DISTINCT r.id) as review_count,
             COALESCE(AVG(r.rating), 0) as avg_rating
      ${baseQuery}
      GROUP BY svc.id
      ORDER BY avg_rating DESC, review_count DESC, svc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [services] = await pool.query(selectQuery, [...params, limitVal, offset]);

    return res.status(200).json({
      success: true,
      services,
      pagination: {
        page: parseInt(page, 10),
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    console.error('[GetServices Controller Error]:', error);
    next(error);
  }
};

/**
 * Get service details by ID
 * GET /api/services/:id
 */
export const getServiceById = async (req, res, next) => {
  try {
    const serviceId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `SELECT svc.*,
              s.id as skill_id, s.name as skill_name, s.category as skill_category,
              us.proficiency,
              u.id as provider_id, u.username as provider_username, u.full_name as provider_name,
              u.profile_picture as provider_avatar, u.college as provider_college, u.branch as provider_branch,
              u.bio as provider_bio, u.location as provider_location,
              COUNT(DISTINCT r.id) as review_count,
              COALESCE(AVG(r.rating), 0) as avg_rating
       FROM services svc
       JOIN user_skills us ON svc.user_skill_id = us.id
       JOIN skills s ON us.skill_id = s.id
       JOIN users u ON us.user_id = u.id
       LEFT JOIN bookings b ON b.service_id = svc.id AND b.status = 'completed'
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE svc.id = ?
       GROUP BY svc.id`,
      [serviceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service offering not found.' });
    }

    const service = rows[0];

    // Fetch availability of this provider
    const [availabilityRows] = await pool.query(
      'SELECT id, day_of_week, start_time, end_time, is_available FROM availability WHERE provider_id = ? AND is_available = TRUE ORDER BY day_of_week ASC, start_time ASC',
      [service.provider_id]
    );
    service.availability = availabilityRows;

    // Fetch recent reviews for this service
    const [reviewRows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.username as reviewer_username, u.full_name as reviewer_name, u.profile_picture as reviewer_avatar
       FROM reviews r
       JOIN bookings b ON r.booking_id = b.id
       JOIN users u ON r.reviewer_id = u.id
       WHERE b.service_id = ?
       ORDER BY r.created_at DESC LIMIT 10`,
      [serviceId]
    );
    service.reviews = reviewRows;

    return res.status(200).json({ success: true, service });
  } catch (error) {
    console.error('[GetServiceById Controller Error]:', error);
    next(error);
  }
};

/**
 * Create a new service offering for a user's skill
 * POST /api/services
 */
export const createService = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      user_skill_id,
      category,
      title,
      description,
      pricing_type,
      price,
      duration_minutes,
      online_available = true,
      in_person_available = false
    } = req.body;

    if (!user_skill_id) {
      return res.status(400).json({ success: false, message: 'Please select a skill from your profile to offer as a service.' });
    }
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Service title is required.' });
    }
    if (!pricing_type || !['hourly', 'per_session', 'fixed_project'].includes(pricing_type)) {
      return res.status(400).json({ success: false, message: 'Pricing type must be hourly, per_session, or fixed_project.' });
    }

    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
    }

    if (!online_available && !in_person_available) {
      return res.status(400).json({ success: false, message: 'At least one delivery mode (online or in-person) must be enabled.' });
    }

    // Verify user owns the user_skill
    const [usRows] = await pool.query('SELECT * FROM user_skills WHERE id = ? AND user_id = ?', [user_skill_id, userId]);
    if (usRows.length === 0) {
      return res.status(403).json({ success: false, message: 'You can only create services for skills listed on your own profile.' });
    }

    // Check if service already exists for this user_skill
    const [existing] = await pool.query('SELECT id FROM services WHERE user_skill_id = ?', [user_skill_id]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A service offering already exists for this skill. Please update the existing service instead.' });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO services (user_skill_id, category, title, description, pricing_type, price, duration_minutes, online_available, in_person_available, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        user_skill_id,
        category || 'Other',
        title.trim(),
        description ? description.trim() : null,
        pricing_type,
        priceVal,
        duration_minutes ? parseInt(duration_minutes, 10) : null,
        Boolean(online_available),
        Boolean(in_person_available)
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Service offering created successfully.',
      serviceId: insertResult.insertId
    });
  } catch (error) {
    console.error('[CreateService Controller Error]:', error);
    next(error);
  }
};

/**
 * Update an existing service
 * PUT /api/services/:id
 */
export const updateService = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const serviceId = parseInt(req.params.id, 10);
    const {
      category,
      title,
      description,
      pricing_type,
      price,
      duration_minutes,
      online_available,
      in_person_available,
      is_active
    } = req.body;

    // Check ownership
    const [svcRows] = await pool.query(
      `SELECT svc.id FROM services svc
       JOIN user_skills us ON svc.user_skill_id = us.id
       WHERE svc.id = ? AND us.user_id = ?`,
      [serviceId, userId]
    );

    if (svcRows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to modify this service.' });
    }

    await pool.query(
      `UPDATE services
       SET category = COALESCE(?, category),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           pricing_type = COALESCE(?, pricing_type),
           price = COALESCE(?, price),
           duration_minutes = COALESCE(?, duration_minutes),
           online_available = COALESCE(?, online_available),
           in_person_available = COALESCE(?, in_person_available),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        category || null,
        title ? title.trim() : null,
        description !== undefined ? description : null,
        pricing_type || null,
        price !== undefined ? parseFloat(price) : null,
        duration_minutes !== undefined ? parseInt(duration_minutes, 10) : null,
        online_available !== undefined ? Boolean(online_available) : null,
        in_person_available !== undefined ? Boolean(in_person_available) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        serviceId
      ]
    );

    return res.status(200).json({ success: true, message: 'Service updated successfully.' });
  } catch (error) {
    console.error('[UpdateService Controller Error]:', error);
    next(error);
  }
};

/**
 * Delete a service
 * DELETE /api/services/:id
 */
export const deleteService = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const serviceId = parseInt(req.params.id, 10);

    const [svcRows] = await pool.query(
      `SELECT svc.id FROM services svc
       JOIN user_skills us ON svc.user_skill_id = us.id
       WHERE svc.id = ? AND us.user_id = ?`,
      [serviceId, userId]
    );

    if (svcRows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this service.' });
    }

    await pool.query('DELETE FROM services WHERE id = ?', [serviceId]);
    return res.status(200).json({ success: true, message: 'Service offering deleted.' });
  } catch (error) {
    console.error('[DeleteService Controller Error]:', error);
    next(error);
  }
};
