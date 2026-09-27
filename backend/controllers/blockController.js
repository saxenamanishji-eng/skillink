import pool from '../config/db.js';

/**
 * Get users blocked by current user
 * GET /api/blocks
 */
export const getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT b.id as block_id, b.created_at, u.id as user_id, u.username, u.full_name, u.profile_picture
       FROM blocks b
       JOIN users u ON b.blocked_id = u.id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return res.status(200).json({ success: true, blocked_users: rows });
  } catch (error) {
    console.error('[GetBlockedUsers Controller Error]:', error);
    next(error);
  }
};

/**
 * Block a user
 * POST /api/blocks
 */
export const blockUser = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const blockerId = req.user.id;
    const { target_user_id } = req.body;
    const blockedId = parseInt(target_user_id, 10);

    if (!blockedId || isNaN(blockedId)) {
      return res.status(400).json({ success: false, message: 'Valid target user ID is required.' });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    await connection.beginTransaction();

    // Insert block
    await connection.query(
      'INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
      [blockerId, blockedId]
    );

    // Remove any active connections between these two users
    await connection.query(
      'DELETE FROM connections WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)',
      [blockerId, blockedId, blockedId, blockerId]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'User has been blocked.' });
  } catch (error) {
    await connection.rollback();
    console.error('[BlockUser Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Unblock a user
 * DELETE /api/blocks/:userId
 */
export const unblockUser = async (req, res, next) => {
  try {
    const blockerId = req.user.id;
    const targetUserId = parseInt(req.params.userId, 10);

    const [result] = await pool.query(
      'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, targetUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Block record not found.' });
    }

    return res.status(200).json({ success: true, message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('[UnblockUser Controller Error]:', error);
    next(error);
  }
};
