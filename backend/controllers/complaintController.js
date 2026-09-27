import pool from '../config/db.js';

/**
 * Get user's complaints
 * GET /api/complaints
 */
export const getComplaints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [complaints] = await pool.query(
      `SELECT c.*,
              ru.username as reported_username, ru.full_name as reported_name
       FROM complaints c
       LEFT JOIN users ru ON c.reported_user_id = ru.id
       WHERE c.complainant_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error('[GetComplaints Controller Error]:', error);
    next(error);
  }
};

/**
 * Get complaint by ID
 * GET /api/complaints/:id
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const complaintId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `SELECT c.*,
              u.username as complainant_username, u.full_name as complainant_name,
              ru.username as reported_username, ru.full_name as reported_name,
              adm.full_name as assigned_admin_name
       FROM complaints c
       JOIN users u ON c.complainant_id = u.id
       LEFT JOIN users ru ON c.reported_user_id = ru.id
       LEFT JOIN users adm ON c.assigned_admin_id = adm.id
       WHERE c.id = ? AND (c.complainant_id = ? OR ? = 'admin')`,
      [complaintId, userId, req.user.role]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found or access denied.' });
    }

    return res.status(200).json({ success: true, complaint: rows[0] });
  } catch (error) {
    console.error('[GetComplaintById Controller Error]:', error);
    next(error);
  }
};

/**
 * Submit a complaint
 * POST /api/complaints
 */
export const createComplaint = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const complainantId = req.user.id;
    const {
      complaint_type,
      reported_user_id,
      service_id,
      booking_id,
      review_id,
      subject,
      description,
      priority = 'normal'
    } = req.body;

    const allowedTypes = ['user', 'service', 'booking', 'review', 'connection', 'privacy', 'technical', 'other'];
    if (!complaint_type || !allowedTypes.includes(complaint_type)) {
      return res.status(400).json({ success: false, message: `Invalid complaint type. Allowed types: ${allowedTypes.join(', ')}.` });
    }

    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Detailed description is required.' });
    }

    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      `INSERT INTO complaints (complainant_id, reported_user_id, complaint_type, service_id, booking_id, review_id, subject, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [
        complainantId,
        reported_user_id ? parseInt(reported_user_id, 10) : null,
        complaint_type,
        service_id ? parseInt(service_id, 10) : null,
        booking_id ? parseInt(booking_id, 10) : null,
        review_id ? parseInt(review_id, 10) : null,
        subject.trim(),
        description.trim(),
        priority
      ]
    );

    const complaintId = insertResult.insertId;

    // Notification to complainant
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES (?, 'complaint_created', 'Complaint Ticket Logged', ?, 'complaint', ?)`,
      [complainantId, `Your complaint "${subject.trim()}" has been received by platform administrators.`, complaintId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully. An administrator will investigate and respond.',
      complaintId
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateComplaint Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};
