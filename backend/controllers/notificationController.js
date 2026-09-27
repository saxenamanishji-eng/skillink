import pool from '../config/db.js';

/**
 * Get current user's notifications
 * GET /api/notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [notifications] = await pool.query(
      `SELECT n.*,
              u.username as sender_username, u.full_name as sender_name, u.profile_picture as sender_avatar
       FROM notifications n
       LEFT JOIN users u ON n.related_user_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );

    const [unreadCountRows] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return res.status(200).json({
      success: true,
      notifications,
      unread_count: unreadCountRows[0].unread_count
    });
  } catch (error) {
    console.error('[GetNotifications Controller Error]:', error);
    next(error);
  }
};

/**
 * Mark single notification as read
 * PUT /api/notifications/:id/read
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifId = parseInt(req.params.id, 10);

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notifId, userId]
    );

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('[MarkNotificationRead Controller Error]:', error);
    next(error);
  }
};

/**
 * Mark all notifications for user as read
 * PUT /api/notifications/read-all
 */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('[MarkAllNotificationsRead Controller Error]:', error);
    next(error);
  }
};
