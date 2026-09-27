import pool from '../config/db.js';

/**
 * Submit a report against content or a user
 * POST /api/reports
 */
export const createReport = async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const {
      reported_user_id,
      content_type,
      content_id,
      reason,
      description
    } = req.body;

    const allowedContentTypes = ['profile', 'service', 'booking', 'review', 'endorsement', 'other'];
    const allowedReasons = ['spam', 'fake_profile', 'harassment', 'inappropriate_content', 'misleading_service', 'suspicious_activity', 'other'];

    if (!content_type || !allowedContentTypes.includes(content_type)) {
      return res.status(400).json({ success: false, message: `Invalid content type. Allowed: ${allowedContentTypes.join(', ')}.` });
    }

    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: `Invalid reason. Allowed: ${allowedReasons.join(', ')}.` });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, content_type, content_id, reason, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        reporterId,
        reported_user_id ? parseInt(reported_user_id, 10) : null,
        content_type,
        content_id ? parseInt(content_id, 10) : null,
        reason,
        description ? description.trim() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Report submitted. Platform moderators will review this item shortly.',
      reportId: insertResult.insertId
    });
  } catch (error) {
    console.error('[CreateReport Controller Error]:', error);
    next(error);
  }
};
