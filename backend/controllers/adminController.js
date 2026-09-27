import pool from '../config/db.js';

/**
 * Helper to record append-only admin audit log inside a transaction
 */
const recordAuditLog = async (connection, adminId, action, targetType, targetId, reason, oldData, newData) => {
  await connection.query(
    `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, reason, old_data, new_data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      action,
      targetType,
      targetId || null,
      reason || 'Administrative action performed',
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null
    ]
  );
};

/**
 * Admin Dashboard Metrics (100% Real Queries, No Faked Stats)
 * GET /api/admin/dashboard
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const [userStats] = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
      FROM users
    `);

    const [bookingStats] = await pool.query(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as total_volume_inr
      FROM bookings
    `);

    const [supportStats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM complaints WHERE status = 'open') as open_complaints,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM helpdesk_tickets WHERE status = 'open' OR status = 'in_progress') as active_tickets
    `);

    const [topSkills] = await pool.query(`
      SELECT s.name, COUNT(us.id) as user_count, COUNT(DISTINCT e.id) as endorsement_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN endorsements e ON s.id = e.skill_id
      GROUP BY s.id
      ORDER BY user_count DESC, endorsement_count DESC
      LIMIT 5
    `);

    const [recentAuditLogs] = await pool.query(`
      SELECT l.*, u.username as admin_username, u.full_name as admin_name
      FROM admin_audit_logs l
      JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      metrics: {
        users: userStats[0],
        bookings: bookingStats[0],
        support: supportStats[0],
        top_skills: topSkills,
        recent_logs: recentAuditLogs
      }
    });
  } catch (error) {
    console.error('[GetAdminDashboard Controller Error]:', error);
    next(error);
  }
};

/**
 * Admin User Management (Search, Filter, List)
 * GET /api/admin/users
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const limitVal = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitVal;

    let where = '1=1';
    const params = [];

    if (search && search.trim()) {
      where += ' AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.college LIKE ?)';
      const t = `%${search.trim()}%`;
      params.push(t, t, t, t);
    }

    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }

    if (status) {
      where += ' AND u.status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users u WHERE ${where}`, params);
    const total = countRows[0].total;

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.college, u.branch, u.graduation_year,
              u.role, u.status, u.created_at, u.updated_at, p.phone,
              (SELECT COUNT(*) FROM user_skills WHERE user_id = u.id) as skill_count,
              (SELECT COUNT(*) FROM bookings WHERE provider_id = u.id OR customer_id = u.id) as booking_count
       FROM users u
       LEFT JOIN user_private p ON u.id = p.user_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitVal, offset]
    );

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page, 10),
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    console.error('[GetAdminUsers Controller Error]:', error);
    next(error);
  }
};

/**
 * Update user status (suspend / activate) or role with audit logging
 * PUT /api/admin/users/:id/status
 */
export const updateAdminUserStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const targetUserId = parseInt(req.params.id, 10);
    const { status, role, reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'An administrative reason must be provided for this action.' });
    }

    if (adminId === targetUserId && status === 'suspended') {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own administrator account.' });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [targetUserId]);
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const oldUser = userRows[0];
    const newStatus = status || oldUser.status;
    const newRole = role || oldUser.role;

    await connection.query(
      'UPDATE users SET status = ?, role = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, newRole, targetUserId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'update_user_status_or_role',
      'user',
      targetUserId,
      reason.trim(),
      { status: oldUser.status, role: oldUser.role },
      { status: newStatus, role: newRole }
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `User ${oldUser.username} status updated to "${newStatus}" (role: "${newRole}").`
    });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateAdminUserStatus Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Skills CRUD
 * GET /api/admin/skills
 * POST /api/admin/skills
 * PUT /api/admin/skills/:id
 * DELETE /api/admin/skills/:id
 */
export const getAdminSkills = async (req, res, next) => {
  try {
    const [skills] = await pool.query(`
      SELECT s.*,
             COUNT(DISTINCT us.user_id) as user_count,
             COUNT(DISTINCT e.id) as endorsement_count,
             COUNT(DISTINCT svc.id) as service_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN endorsements e ON s.id = e.skill_id
      LEFT JOIN services svc ON svc.user_skill_id = us.id
      GROUP BY s.id
      ORDER BY user_count DESC, s.name ASC
    `);
    return res.status(200).json({ success: true, skills });
  } catch (error) {
    console.error('[GetAdminSkills Controller Error]:', error);
    next(error);
  }
};

export const createAdminSkill = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const { name, category, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    await connection.beginTransaction();

    const [resInsert] = await connection.query(
      'INSERT INTO skills (name, category, description) VALUES (?, ?, ?)',
      [name.trim(), category ? category.trim() : 'General', description ? description.trim() : null]
    );

    await recordAuditLog(
      connection,
      adminId,
      'create_skill',
      'skill',
      resInsert.insertId,
      'Administrator added new standard skill',
      null,
      { name: name.trim(), category }
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Skill created successfully.', skillId: resInsert.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateAdminSkill Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

export const updateAdminSkill = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const skillId = parseInt(req.params.id, 10);
    const { name, category, description } = req.body;

    await connection.beginTransaction();

    const [oldRows] = await connection.query('SELECT * FROM skills WHERE id = ? FOR UPDATE', [skillId]);
    if (oldRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Skill not found.' });
    }

    const oldSkill = oldRows[0];

    await connection.query(
      'UPDATE skills SET name = ?, category = ?, description = ? WHERE id = ?',
      [name ? name.trim() : oldSkill.name, category ? category.trim() : oldSkill.category, description !== undefined ? description : oldSkill.description, skillId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'update_skill',
      'skill',
      skillId,
      'Administrator updated skill metadata',
      oldSkill,
      { name, category, description }
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Skill updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateAdminSkill Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

export const deleteAdminSkill = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const skillId = parseInt(req.params.id, 10);

    await connection.beginTransaction();

    const [oldRows] = await connection.query('SELECT * FROM skills WHERE id = ? FOR UPDATE', [skillId]);
    if (oldRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Skill not found.' });
    }

    await connection.query('DELETE FROM skills WHERE id = ?', [skillId]);

    await recordAuditLog(
      connection,
      adminId,
      'delete_skill',
      'skill',
      skillId,
      'Administrator deleted skill',
      oldRows[0],
      null
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Skill deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[DeleteAdminSkill Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Services Management
 * GET /api/admin/services
 * PUT /api/admin/services/:id/status
 */
export const getAdminServices = async (req, res, next) => {
  try {
    const [services] = await pool.query(`
      SELECT svc.*, s.name as skill_name, u.username as provider_username, u.full_name as provider_name, u.email as provider_email,
             COUNT(DISTINCT b.id) as booking_count
      FROM services svc
      JOIN user_skills us ON svc.user_skill_id = us.id
      JOIN skills s ON us.skill_id = s.id
      JOIN users u ON us.user_id = u.id
      LEFT JOIN bookings b ON b.service_id = svc.id
      GROUP BY svc.id
      ORDER BY svc.created_at DESC
    `);
    return res.status(200).json({ success: true, services });
  } catch (error) {
    console.error('[GetAdminServices Controller Error]:', error);
    next(error);
  }
};

export const updateAdminServiceStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const serviceId = parseInt(req.params.id, 10);
    const { is_active, reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reason is required for modifying service status.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM services WHERE id = ? FOR UPDATE', [serviceId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    const oldService = rows[0];
    await connection.query('UPDATE services SET is_active = ?, updated_at = NOW() WHERE id = ?', [Boolean(is_active), serviceId]);

    await recordAuditLog(
      connection,
      adminId,
      'toggle_service_active',
      'service',
      serviceId,
      reason.trim(),
      { is_active: oldService.is_active },
      { is_active: Boolean(is_active) }
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: `Service status set to ${is_active ? 'active' : 'inactive'}.` });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateAdminServiceStatus Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Bookings Management
 * GET /api/admin/bookings
 */
export const getAdminBookings = async (req, res, next) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, svc.title as service_title,
             c.username as customer_username, c.full_name as customer_name,
             p.username as provider_username, p.full_name as provider_name
      FROM bookings b
      JOIN services svc ON b.service_id = svc.id
      JOIN users c ON b.customer_id = c.id
      JOIN users p ON b.provider_id = p.id
      ORDER BY b.booking_date DESC, b.start_time DESC
    `);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('[GetAdminBookings Controller Error]:', error);
    next(error);
  }
};

/**
 * Admin Complaints Management
 * GET /api/admin/complaints
 * GET /api/admin/complaints/:id
 * PUT /api/admin/complaints/:id/resolve
 */
export const getAdminComplaints = async (req, res, next) => {
  try {
    const [complaints] = await pool.query(`
      SELECT c.*,
             u.username as complainant_username, u.full_name as complainant_name,
             ru.username as reported_username, ru.full_name as reported_name,
             adm.full_name as assigned_admin_name
      FROM complaints c
      JOIN users u ON c.complainant_id = u.id
      LEFT JOIN users ru ON c.reported_user_id = ru.id
      LEFT JOIN users adm ON c.assigned_admin_id = adm.id
      ORDER BY c.created_at DESC
    `);
    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('[GetAdminComplaints Controller Error]:', error);
    next(error);
  }
};

export const resolveAdminComplaint = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const complaintId = parseInt(req.params.id, 10);
    const { status, admin_response, resolution_note } = req.body;

    if (!['under_review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be under_review, resolved, or rejected.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM complaints WHERE id = ? FOR UPDATE', [complaintId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const oldComplaint = rows[0];

    await connection.query(
      `UPDATE complaints
       SET status = ?,
           admin_response = ?,
           resolution_note = ?,
           assigned_admin_id = ?,
           resolved_at = CASE WHEN ? = 'resolved' OR ? = 'rejected' THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = ?`,
      [status, admin_response || null, resolution_note || null, adminId, status, status, complaintId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'resolve_complaint',
      'complaint',
      complaintId,
      resolution_note || admin_response || `Complaint updated to ${status}`,
      { status: oldComplaint.status },
      { status, admin_response, resolution_note }
    );

    // Notify complainant
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES (?, 'complaint_resolved', 'Complaint Status Updated', ?, 'complaint', ?)`,
      [oldComplaint.complainant_id, `Your complaint #${complaintId} has been updated to "${status}".`, complaintId]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Complaint resolved and updated.' });
  } catch (error) {
    await connection.rollback();
    console.error('[ResolveAdminComplaint Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Reports Management
 * GET /api/admin/reports
 * PUT /api/admin/reports/:id/resolve
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const [reports] = await pool.query(`
      SELECT r.*,
             u.username as reporter_username, u.full_name as reporter_name,
             ru.username as reported_username, ru.full_name as reported_name,
             adm.full_name as resolved_by_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      LEFT JOIN users ru ON r.reported_user_id = ru.id
      LEFT JOIN users adm ON r.resolved_by = adm.id
      ORDER BY r.created_at DESC
    `);
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error('[GetAdminReports Controller Error]:', error);
    next(error);
  }
};

export const resolveAdminReport = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const reportId = parseInt(req.params.id, 10);
    const { status, resolution_note } = req.body;

    if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be reviewing, resolved, or dismissed.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM reports WHERE id = ? FOR UPDATE', [reportId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const oldReport = rows[0];

    await connection.query(
      `UPDATE reports
       SET status = ?,
           resolution_note = ?,
           resolved_by = ?,
           resolved_at = CASE WHEN ? = 'resolved' OR ? = 'dismissed' THEN NOW() ELSE resolved_at END
       WHERE id = ?`,
      [status, resolution_note || null, adminId, status, status, reportId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'resolve_report',
      'report',
      reportId,
      resolution_note || `Report updated to ${status}`,
      { status: oldReport.status },
      { status, resolution_note }
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Report resolution saved.' });
  } catch (error) {
    await connection.rollback();
    console.error('[ResolveAdminReport Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Helpdesk Management
 * GET /api/admin/helpdesk
 * PUT /api/admin/helpdesk/:id/status
 */
export const getAdminHelpdeskTickets = async (req, res, next) => {
  try {
    const [tickets] = await pool.query(`
      SELECT t.*, c.name as category_name,
             u.username, u.full_name, u.email,
             adm.full_name as assigned_admin_name,
             (SELECT COUNT(*) FROM helpdesk_messages WHERE ticket_id = t.id) as message_count
      FROM helpdesk_tickets t
      JOIN helpdesk_categories c ON t.category_id = c.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users adm ON t.assigned_admin_id = adm.id
      ORDER BY t.updated_at DESC
    `);
    return res.status(200).json({ success: true, tickets });
  } catch (error) {
    console.error('[GetAdminHelpdeskTickets Controller Error]:', error);
    next(error);
  }
};

export const updateAdminHelpdeskStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const ticketId = parseInt(req.params.id, 10);
    const { status, priority, assigned_admin_id } = req.body;

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM helpdesk_tickets WHERE id = ? FOR UPDATE', [ticketId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const oldTicket = rows[0];
    const newStatus = status || oldTicket.status;

    await connection.query(
      `UPDATE helpdesk_tickets
       SET status = ?,
           priority = COALESCE(?, priority),
           assigned_admin_id = COALESCE(?, assigned_admin_id),
           resolved_at = CASE WHEN ? = 'resolved' OR ? = 'closed' THEN NOW() ELSE resolved_at END,
           updated_at = NOW()
       WHERE id = ?`,
      [newStatus, priority || null, assigned_admin_id || adminId, newStatus, newStatus, ticketId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'update_helpdesk_status',
      'helpdesk_ticket',
      ticketId,
      `Support ticket #${ticketId} status changed to ${newStatus}`,
      { status: oldTicket.status, priority: oldTicket.priority },
      { status: newStatus, priority: priority || oldTicket.priority }
    );

    // Notify ticket owner
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES (?, 'helpdesk_resolved', 'Ticket Status Updated', ?, 'helpdesk_ticket', ?)`,
      [oldTicket.user_id, `Your support ticket #${ticketId} status has been updated to "${newStatus}".`, ticketId]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Helpdesk ticket updated.' });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateAdminHelpdeskStatus Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Reviews Moderation
 * GET /api/admin/reviews
 * DELETE /api/admin/reviews/:id
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const [reviews] = await pool.query(`
      SELECT r.*,
             u.username as reviewer_username, u.full_name as reviewer_name,
             p.username as provider_username, p.full_name as provider_name,
             svc.title as service_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN users p ON r.provider_id = p.id
      JOIN bookings b ON r.booking_id = b.id
      JOIN services svc ON b.service_id = svc.id
      ORDER BY r.created_at DESC
    `);
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('[GetAdminReviews Controller Error]:', error);
    next(error);
  }
};

export const deleteAdminReview = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const reviewId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reason is required for moderating/removing a review.' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM reviews WHERE id = ? FOR UPDATE', [reviewId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    await connection.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    await recordAuditLog(
      connection,
      adminId,
      'delete_review_moderation',
      'review',
      reviewId,
      reason.trim(),
      rows[0],
      null
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Review removed by administrator.' });
  } catch (error) {
    await connection.rollback();
    console.error('[DeleteAdminReview Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Admin Help Center Articles CRUD
 * GET /api/admin/help-articles
 * POST /api/admin/help-articles
 * PUT /api/admin/help-articles/:id
 * DELETE /api/admin/help-articles/:id
 */
export const getAdminArticles = async (req, res, next) => {
  try {
    const [articles] = await pool.query(`
      SELECT a.*, u.full_name as author_name
      FROM help_articles a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);
    return res.status(200).json({ success: true, articles });
  } catch (error) {
    console.error('[GetAdminArticles Controller Error]:', error);
    next(error);
  }
};

export const createAdminArticle = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const { title, slug, category, content, status = 'published' } = req.body;

    if (!title || !slug || !category || !content) {
      return res.status(400).json({ success: false, message: 'Title, slug, category, and content are required.' });
    }

    await connection.beginTransaction();

    const [resInsert] = await connection.query(
      `INSERT INTO help_articles (title, slug, category, content, status, author_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN NOW() ELSE NULL END)`,
      [title.trim(), slug.trim().toLowerCase(), category.trim(), content.trim(), status, adminId, status]
    );

    await recordAuditLog(
      connection,
      adminId,
      'create_help_article',
      'help_article',
      resInsert.insertId,
      `Created article: ${title.trim()}`,
      null,
      { title, slug, category, status }
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Article created successfully.', articleId: resInsert.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateAdminArticle Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

export const updateAdminArticle = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const articleId = parseInt(req.params.id, 10);
    const { title, slug, category, content, status } = req.body;

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM help_articles WHERE id = ? FOR UPDATE', [articleId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    const oldArticle = rows[0];

    await connection.query(
      `UPDATE help_articles
       SET title = COALESCE(?, title),
           slug = COALESCE(?, slug),
           category = COALESCE(?, category),
           content = COALESCE(?, content),
           status = COALESCE(?, status),
           published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
           updated_at = NOW()
       WHERE id = ?`,
      [title ? title.trim() : null, slug ? slug.trim().toLowerCase() : null, category ? category.trim() : null, content ? content.trim() : null, status || null, status || oldArticle.status, articleId]
    );

    await recordAuditLog(
      connection,
      adminId,
      'update_help_article',
      'help_article',
      articleId,
      `Updated article: ${title || oldArticle.title}`,
      oldArticle,
      { title, slug, category, status }
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Article updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateAdminArticle Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

export const deleteAdminArticle = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const articleId = parseInt(req.params.id, 10);

    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM help_articles WHERE id = ? FOR UPDATE', [articleId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    await connection.query('DELETE FROM help_articles WHERE id = ?', [articleId]);

    await recordAuditLog(
      connection,
      adminId,
      'delete_help_article',
      'help_article',
      articleId,
      `Deleted article: ${rows[0].title}`,
      rows[0],
      null
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Article deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[DeleteAdminArticle Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Append-Only Audit Logs Inspection
 * GET /api/admin/audit-logs
 */
export const getAdminAuditLogs = async (req, res, next) => {
  try {
    const { action, target_type, page = 1, limit = 50 } = req.query;
    const limitVal = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitVal;

    let where = '1=1';
    const params = [];

    if (action) {
      where += ' AND l.action = ?';
      params.push(action);
    }
    if (target_type) {
      where += ' AND l.target_type = ?';
      params.push(target_type);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM admin_audit_logs l WHERE ${where}`, params);
    const total = countRows[0].total;

    const [logs] = await pool.query(
      `SELECT l.*, u.username as admin_username, u.full_name as admin_name
       FROM admin_audit_logs l
       JOIN users u ON l.admin_id = u.id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitVal, offset]
    );

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page, 10),
        limit: limitVal,
        total,
        totalPages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    console.error('[GetAdminAuditLogs Controller Error]:', error);
    next(error);
  }
};

/**
 * Admin Advanced Analytics
 * GET /api/admin/analytics
 */
export const getAdminAnalytics = async (req, res, next) => {
  try {
    // 1. User registration trends
    const [userTrends] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM users
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // 2. Service Category breakdown
    const [categoryBreakdown] = await pool.query(`
      SELECT category, COUNT(*) as count, AVG(price) as avg_price
      FROM services
      GROUP BY category
      ORDER BY count DESC
    `);

    // 3. Booking status breakdown
    const [bookingStatusBreakdown] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM bookings
      GROUP BY status
    `);

    // 4. Complaint Resolution Rate
    const [complaintStats] = await pool.query(`
      SELECT
        COUNT(*) as total_complaints,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_complaints,
        AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) ELSE NULL END) as avg_resolution_hours
      FROM complaints
    `);

    return res.status(200).json({
      success: true,
      analytics: {
        user_trends: userTrends,
        category_breakdown: categoryBreakdown,
        booking_status: bookingStatusBreakdown,
        complaint_performance: complaintStats[0]
      }
    });
  } catch (error) {
    console.error('[GetAdminAnalytics Controller Error]:', error);
    next(error);
  }
};
