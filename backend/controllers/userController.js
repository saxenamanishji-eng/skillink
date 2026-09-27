import pool from '../config/db.js';
import { toPublicProfile } from '../utils/serializer.js';
import { URL_REGEX } from '../utils/validation.js';

/**
 * Get user profile by ID or username
 * GET /api/users/:idOrUsername
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const { idOrUsername } = req.params;
    const viewerId = req.user ? req.user.id : null;
    const isAdmin = req.user ? req.user.role === 'admin' : false;

    const isNumeric = /^\d+$/.test(idOrUsername);
    let userQuery = `SELECT u.*, p.phone FROM users u LEFT JOIN user_private p ON u.id = p.user_id WHERE `;
    userQuery += isNumeric ? 'u.id = ?' : 'u.username = ?';

    const [userRows] = await pool.query(userQuery, [idOrUsername]);

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userRows[0];
    const targetUserId = targetUser.id;

    // Check if viewer is blocked by target user or viewer has blocked target user
    if (viewerId && viewerId !== targetUserId) {
      const [blockRows] = await pool.query(
        'SELECT * FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
        [viewerId, targetUserId, targetUserId, viewerId]
      );
      if (blockRows.length > 0) {
        return res.status(403).json({ success: false, message: 'You cannot view this profile due to privacy or blocking restrictions.' });
      }
    }

    // Fetch user's skills with endorsement metrics
    const [skillsRows] = await pool.query(
      `SELECT us.id as user_skill_id, us.proficiency, us.created_at,
              s.id as skill_id, s.name, s.category, s.description,
              COUNT(e.id) as endorsement_count,
              COALESCE(AVG(e.rating), 0) as avg_rating
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       LEFT JOIN endorsements e ON e.to_user_id = us.user_id AND e.skill_id = s.id
       WHERE us.user_id = ?
       GROUP BY us.id, s.id
       ORDER BY us.proficiency DESC, endorsement_count DESC`,
      [targetUserId]
    );

    // Fetch external profiles
    const [externalRows] = await pool.query(
      'SELECT id, platform, username, profile_url FROM external_profiles WHERE user_id = ? ORDER BY platform ASC',
      [targetUserId]
    );

    // Fetch active services offered by this user
    const [servicesRows] = await pool.query(
      `SELECT svc.*, s.name as skill_name, us.proficiency,
              COUNT(DISTINCT r.id) as review_count,
              COALESCE(AVG(r.rating), 0) as avg_rating
       FROM services svc
       JOIN user_skills us ON svc.user_skill_id = us.id
       JOIN skills s ON us.skill_id = s.id
       LEFT JOIN bookings b ON b.service_id = svc.id AND b.status = 'completed'
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE us.user_id = ? AND svc.is_active = TRUE
       GROUP BY svc.id
       ORDER BY svc.created_at DESC`,
      [targetUserId]
    );

    // Fetch connection status if viewer is logged in
    let connectionStatus = null;
    let whereWeMet = null;
    let connectionId = null;

    if (viewerId && viewerId !== targetUserId) {
      const [connRows] = await pool.query(
        `SELECT id, requester_id, receiver_id, status, where_we_met FROM connections
         WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)`,
        [viewerId, targetUserId, targetUserId, viewerId]
      );
      if (connRows.length > 0) {
        connectionStatus = connRows[0].status;
        whereWeMet = connRows[0].where_we_met;
        connectionId = connRows[0].id;
      }
    }

    // Attach enriched fields
    targetUser.skills = skillsRows;
    targetUser.external_profiles = externalRows;
    targetUser.services = servicesRows;
    targetUser.connection_status = connectionStatus ? {
      id: connectionId,
      status: connectionStatus,
      where_we_met: whereWeMet
    } : null;

    const safeProfile = toPublicProfile(targetUser, viewerId, isAdmin);
    return res.status(200).json({ success: true, profile: safeProfile });
  } catch (error) {
    console.error('[GetUserProfile Controller Error]:', error);
    next(error);
  }
};

/**
 * Update authenticated user's profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { full_name, college, branch, graduation_year, bio, location, phone } = req.body;

    if (full_name !== undefined && full_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
    }

    const gradYear = graduation_year ? parseInt(graduation_year, 10) : null;
    if (gradYear && (gradYear < 1990 || gradYear > 2100)) {
      return res.status(400).json({ success: false, message: 'Graduation year must be between 1990 and 2100.' });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           college = ?,
           branch = ?,
           graduation_year = ?,
           bio = ?,
           location = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [full_name ? full_name.trim() : null, college || null, branch || null, gradYear, bio || null, location || null, userId]
    );

    if (phone !== undefined) {
      await connection.query(
        `INSERT INTO user_private (user_id, phone, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE phone = VALUES(phone), updated_at = NOW()`,
        [userId, phone ? phone.trim() : null]
      );
    }

    await connection.commit();

    const [updatedRows] = await pool.query(
      `SELECT u.*, p.phone FROM users u LEFT JOIN user_private p ON u.id = p.user_id WHERE u.id = ?`,
      [userId]
    );

    const safeUser = toPublicProfile(updatedRows[0], userId, req.user.role === 'admin');
    return res.status(200).json({ success: true, message: 'Profile updated successfully.', user: safeUser });
  } catch (error) {
    await connection.rollback();
    console.error('[UpdateProfile Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Upload profile avatar
 * POST /api/users/avatar
 */
export const uploadAvatarHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?', [avatarUrl, req.user.id]);

    return res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully.',
      profile_picture: avatarUrl
    });
  } catch (error) {
    console.error('[UploadAvatar Controller Error]:', error);
    next(error);
  }
};

/**
 * Add a skill to user's profile
 * POST /api/users/:id/skills
 */
export const addUserSkill = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (req.user.id !== targetUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only manage skills on your own profile.' });
    }

    const { skill_id, skill_name, proficiency, category, description } = req.body;
    const prof = parseInt(proficiency, 10);

    if (isNaN(prof) || prof < 1 || prof > 10) {
      return res.status(400).json({ success: false, message: 'Proficiency level must be an integer between 1 and 10.' });
    }

    let finalSkillId = skill_id;

    // If skill_id is not provided, find by name or create a new skill entry
    if (!finalSkillId && skill_name) {
      const trimmedName = skill_name.trim();
      const [existingSkill] = await pool.query('SELECT id FROM skills WHERE name = ?', [trimmedName]);
      if (existingSkill.length > 0) {
        finalSkillId = existingSkill[0].id;
      } else {
        const [createSkill] = await pool.query(
          'INSERT INTO skills (name, category, description) VALUES (?, ?, ?)',
          [trimmedName, category || 'General', description || null]
        );
        finalSkillId = createSkill.insertId;
      }
    }

    if (!finalSkillId) {
      return res.status(400).json({ success: false, message: 'Skill ID or Skill Name is required.' });
    }

    // Insert or update proficiency
    await pool.query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE proficiency = VALUES(proficiency), updated_at = NOW()`,
      [targetUserId, finalSkillId, prof]
    );

    return res.status(200).json({ success: true, message: 'Skill saved to profile successfully.' });
  } catch (error) {
    console.error('[AddUserSkill Controller Error]:', error);
    next(error);
  }
};

/**
 * Remove a skill from user profile
 * DELETE /api/users/:id/skills/:skillId
 */
export const removeUserSkill = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const skillId = parseInt(req.params.skillId, 10);

    if (req.user.id !== targetUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only manage skills on your own profile.' });
    }

    const [resDelete] = await pool.query(
      'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
      [targetUserId, skillId]
    );

    if (resDelete.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Skill was not found on your profile.' });
    }

    return res.status(200).json({ success: true, message: 'Skill removed from your profile.' });
  } catch (error) {
    console.error('[RemoveUserSkill Controller Error]:', error);
    next(error);
  }
};

/**
 * Add or update external profile link
 * POST /api/users/:id/external
 */
export const saveExternalProfile = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (req.user.id !== targetUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only manage external links on your own profile.' });
    }

    const { platform, username, profile_url } = req.body;
    const allowedPlatforms = ['linkedin', 'github', 'instagram', 'portfolio', 'x'];

    if (!platform || !allowedPlatforms.includes(platform)) {
      return res.status(400).json({ success: false, message: `Platform must be one of: ${allowedPlatforms.join(', ')}.` });
    }

    if (!profile_url || !URL_REGEX.test(profile_url.trim())) {
      return res.status(400).json({ success: false, message: 'Profile URL must be a valid HTTPS URL (starting with https://).' });
    }

    await pool.query(
      `INSERT INTO external_profiles (user_id, platform, username, profile_url, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE username = VALUES(username), profile_url = VALUES(profile_url), updated_at = NOW()`,
      [targetUserId, platform, username ? username.trim() : null, profile_url.trim()]
    );

    return res.status(200).json({ success: true, message: 'External profile link saved successfully.' });
  } catch (error) {
    console.error('[SaveExternalProfile Controller Error]:', error);
    next(error);
  }
};

/**
 * Delete external profile link
 * DELETE /api/users/:id/external/:platform
 */
export const deleteExternalProfile = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { platform } = req.params;

    if (req.user.id !== targetUserId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only manage external links on your own profile.' });
    }

    await pool.query('DELETE FROM external_profiles WHERE user_id = ? AND platform = ?', [targetUserId, platform]);
    return res.status(200).json({ success: true, message: 'External link removed.' });
  } catch (error) {
    console.error('[DeleteExternalProfile Controller Error]:', error);
    next(error);
  }
};
