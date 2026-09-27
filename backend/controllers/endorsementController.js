import pool from '../config/db.js';

/**
 * Get endorsements received for a user or user skill
 * GET /api/endorsements?to_user_id=123&skill_id=456
 */
export const getEndorsements = async (req, res, next) => {
  try {
    const { to_user_id, skill_id } = req.query;

    if (!to_user_id) {
      return res.status(400).json({ success: false, message: 'to_user_id query parameter is required.' });
    }

    let query = `
      SELECT e.id, e.rating, e.message, e.created_at,
             s.id as skill_id, s.name as skill_name, s.category as skill_category,
             u.id as endorser_id, u.username as endorser_username, u.full_name as endorser_name, u.profile_picture as endorser_avatar
      FROM endorsements e
      JOIN skills s ON e.skill_id = s.id
      JOIN users u ON e.from_user_id = u.id
      WHERE e.to_user_id = ?
    `;
    const params = [to_user_id];

    if (skill_id) {
      query += ' AND e.skill_id = ?';
      params.push(skill_id);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, endorsements: rows });
  } catch (error) {
    console.error('[GetEndorsements Controller Error]:', error);
    next(error);
  }
};

/**
 * Endorse a peer's skill
 * POST /api/endorsements
 */
export const createEndorsement = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const fromUserId = req.user.id;
    const { to_user_id, skill_id, rating, message } = req.body;

    const toUserId = parseInt(to_user_id, 10);
    const skillId = parseInt(skill_id, 10);
    const ratingVal = parseInt(rating, 10);

    if (!toUserId || isNaN(toUserId)) {
      return res.status(400).json({ success: false, message: 'Valid recipient user ID is required.' });
    }
    if (!skillId || isNaN(skillId)) {
      return res.status(400).json({ success: false, message: 'Valid skill ID is required.' });
    }
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 10) {
      return res.status(400).json({ success: false, message: 'Endorsement rating must be an integer between 1 and 10.' });
    }
    if (fromUserId === toUserId) {
      return res.status(400).json({ success: false, message: 'You cannot endorse your own skills.' });
    }

    await connection.beginTransaction();

    // 1. Enforce: The endorsed user must actually have that skill in user_skills
    const [userSkillRows] = await connection.query(
      'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ?',
      [toUserId, skillId]
    );
    if (userSkillRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This user does not list this skill on their profile. You can only endorse skills the user actually has.'
      });
    }

    // 2. Enforce: The two users must have an accepted connection
    const [connRows] = await connection.query(
      `SELECT id FROM connections
       WHERE ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
         AND status = 'accepted'`,
      [fromUserId, toUserId, toUserId, fromUserId]
    );
    if (connRows.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You can only endorse skills for users with whom you share an accepted connection.'
      });
    }

    // 3. Enforce: Neither user has blocked the other
    const [blockRows] = await connection.query(
      'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      [fromUserId, toUserId, toUserId, fromUserId]
    );
    if (blockRows.length > 0) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Cannot endorse this skill due to blocking restrictions.' });
    }

    // Insert or update endorsement
    const [insertRes] = await connection.query(
      `INSERT INTO endorsements (from_user_id, to_user_id, skill_id, rating, message)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), message = VALUES(message), created_at = NOW()`,
      [fromUserId, toUserId, skillId, ratingVal, message ? message.trim() : null]
    );

    // Get skill name for notification
    const [skillNameRows] = await connection.query('SELECT name FROM skills WHERE id = ?', [skillId]);
    const skillName = skillNameRows.length > 0 ? skillNameRows[0].name : 'a skill';

    // Notification to recipient
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
       VALUES (?, 'endorsement_received', 'New Skill Endorsement!', ?, ?, 'endorsement', ?)`,
      [toUserId, `${req.user.full_name} endorsed your proficiency in ${skillName} (${ratingVal}/10).`, fromUserId, insertRes.insertId || null]
    );

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: 'Endorsement submitted successfully.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateEndorsement Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};
