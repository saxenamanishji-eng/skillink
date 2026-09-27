import pool from '../config/db.js';

/**
 * Get user's connections (accepted, pending received, pending sent)
 * GET /api/connections
 */
export const getConnections = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // 'accepted', 'pending_received', 'pending_sent', or all

    // Accepted connections
    const [acceptedRows] = await pool.query(
      `SELECT c.id as connection_id, c.status, c.where_we_met, c.created_at, c.updated_at,
              u.id as user_id, u.username, u.full_name, u.profile_picture, u.college, u.branch, u.location,
              (SELECT COUNT(*) FROM user_skills WHERE user_id = u.id) as skill_count
       FROM connections c
       JOIN users u ON (u.id = CASE WHEN c.requester_id = ? THEN c.receiver_id ELSE c.requester_id END)
       WHERE (c.requester_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
       ORDER BY c.updated_at DESC`,
      [userId, userId, userId]
    );

    // Pending requests received (someone requested to connect with me)
    const [pendingReceivedRows] = await pool.query(
      `SELECT c.id as connection_id, c.status, c.where_we_met, c.created_at,
              u.id as user_id, u.username, u.full_name, u.profile_picture, u.college, u.branch
       FROM connections c
       JOIN users u ON u.id = c.requester_id
       WHERE c.receiver_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );

    // Pending requests sent (I requested to connect with someone)
    const [pendingSentRows] = await pool.query(
      `SELECT c.id as connection_id, c.status, c.where_we_met, c.created_at,
              u.id as user_id, u.username, u.full_name, u.profile_picture, u.college, u.branch
       FROM connections c
       JOIN users u ON u.id = c.receiver_id
       WHERE c.requester_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      accepted: acceptedRows,
      pending_received: pendingReceivedRows,
      pending_sent: pendingSentRows
    });
  } catch (error) {
    console.error('[GetConnections Controller Error]:', error);
    next(error);
  }
};

/**
 * Send a connection request
 * POST /api/connections
 */
export const sendConnectionRequest = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const requesterId = req.user.id;
    const { receiver_id, where_we_met } = req.body;
    const receiverId = parseInt(receiver_id, 10);

    if (!receiverId || isNaN(receiverId)) {
      return res.status(400).json({ success: false, message: 'Valid receiver user ID is required.' });
    }

    if (requesterId === receiverId) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
    }

    await connection.beginTransaction();

    // Verify receiver exists and is active
    const [receiverRows] = await connection.query(
      'SELECT id, username, full_name, status FROM users WHERE id = ?',
      [receiverId]
    );

    if (receiverRows.length === 0 || receiverRows[0].status !== 'active') {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User account not found or is inactive.' });
    }

    // Check blocks
    const [blocks] = await connection.query(
      'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      [requesterId, receiverId, receiverId, requesterId]
    );

    if (blocks.length > 0) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Cannot connect with this user due to block restrictions.' });
    }

    // Check existing connection row inside transaction
    const [existing] = await connection.query(
      `SELECT id, requester_id, receiver_id, status FROM connections
       WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
       FOR UPDATE`,
      [requesterId, receiverId, receiverId, requesterId]
    );

    if (existing.length > 0) {
      const conn = existing[0];
      if (conn.status === 'accepted') {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'You are already connected with this user.' });
      }
      if (conn.status === 'pending') {
        if (conn.requester_id === requesterId) {
          await connection.rollback();
          return res.status(409).json({ success: false, message: 'You have already sent a pending connection request to this user.' });
        } else {
          // If the other person already sent a request, auto-accept it!
          await connection.query('UPDATE connections SET status = "accepted", updated_at = NOW() WHERE id = ?', [conn.id]);
          await connection.query(
            `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
             VALUES (?, 'connection_accepted', 'Connection Request Accepted', ?, ?, 'connection', ?)`,
            [conn.requester_id, `${req.user.full_name} accepted your connection request.`, requesterId, conn.id]
          );
          await connection.commit();
          return res.status(200).json({ success: true, message: 'Connection accepted automatically as a mutual request existed.' });
        }
      }

      // If previously rejected, allow re-requesting
      await connection.query(
        'UPDATE connections SET requester_id = ?, receiver_id = ?, status = "pending", where_we_met = ?, updated_at = NOW() WHERE id = ?',
        [requesterId, receiverId, where_we_met ? where_we_met.trim() : null, conn.id]
      );

      // Notification to receiver
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
         VALUES (?, 'connection_request', 'New Connection Request', ?, ?, 'connection', ?)`,
        [receiverId, `${req.user.full_name} sent you a connection request.`, requesterId, conn.id]
      );

      await connection.commit();
      return res.status(200).json({ success: true, message: 'Connection request sent successfully.' });
    }

    // Insert new connection
    const [insertRes] = await connection.query(
      'INSERT INTO connections (requester_id, receiver_id, status, where_we_met) VALUES (?, ?, "pending", ?)',
      [requesterId, receiverId, where_we_met ? where_we_met.trim() : null]
    );

    // Notification to receiver
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
       VALUES (?, 'connection_request', 'New Connection Request', ?, ?, 'connection', ?)`,
      [receiverId, `${req.user.full_name} sent you a connection request.`, requesterId, insertRes.insertId]
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Connection request sent successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[SendConnectionRequest Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Respond to connection request (accept/reject)
 * PUT /api/connections/:id
 */
export const respondToConnection = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "accept" or "reject".' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM connections WHERE id = ? FOR UPDATE',
      [connectionId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Connection request not found.' });
    }

    const conn = rows[0];

    if (conn.receiver_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You can only respond to connection requests sent to you.' });
    }

    if (conn.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `This connection request is already ${conn.status}.` });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await connection.query(
      'UPDATE connections SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, connectionId]
    );

    if (newStatus === 'accepted') {
      // Create notification for original requester
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
         VALUES (?, 'connection_accepted', 'Connection Request Accepted', ?, ?, 'connection', ?)`,
        [conn.requester_id, `${req.user.full_name} accepted your connection request.`, userId, connectionId]
      );
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: `Connection request ${newStatus} successfully.`
    });
  } catch (error) {
    await connection.rollback();
    console.error('[RespondToConnection Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Remove or cancel a connection
 * DELETE /api/connections/:id
 */
export const removeConnection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);

    const [result] = await pool.query(
      'DELETE FROM connections WHERE id = ? AND (requester_id = ? OR receiver_id = ?)',
      [connectionId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Connection not found or already removed.' });
    }

    return res.status(200).json({ success: true, message: 'Connection removed successfully.' });
  } catch (error) {
    console.error('[RemoveConnection Controller Error]:', error);
    next(error);
  }
};
