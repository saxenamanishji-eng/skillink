import pool from '../config/db.js';

/**
 * Discover peers and specialists with real SQL search ranking & pagination
 * GET /api/discover
 */
export const discoverUsers = async (req, res, next) => {
  try {
    const viewerId = req.user ? req.user.id : 0;
    const {
      search,
      skill_id,
      min_proficiency,
      college,
      branch,
      graduation_year,
      location,
      has_service, // 'true' or 'false'
      sort_by = 'relevance', // 'relevance', 'endorsements', 'proficiency', 'newest'
      page = 1,
      limit = 12
    } = req.query;

    const limitVal = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitVal;

    let whereClauses = ["u.status = 'active'", "u.role = 'user'"];
    const params = [];

    // If viewer is logged in, exclude viewer and blocked users
    if (viewerId) {
      whereClauses.push('u.id <> ?');
      params.push(viewerId);

      whereClauses.push(`
        u.id NOT IN (
          SELECT blocked_id FROM blocks WHERE blocker_id = ?
          UNION
          SELECT blocker_id FROM blocks WHERE blocked_id = ?
        )
      `);
      params.push(viewerId, viewerId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push(`(
        u.full_name LIKE ? OR
        u.username LIKE ? OR
        u.college LIKE ? OR
        u.branch LIKE ? OR
        u.location LIKE ? OR
        EXISTS (
          SELECT 1 FROM user_skills us2
          JOIN skills s2 ON us2.skill_id = s2.id
          WHERE us2.user_id = u.id AND s2.name LIKE ?
        )
      )`);
      params.push(term, term, term, term, term, term);
    }

    if (skill_id) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM user_skills us_flt
        WHERE us_flt.user_id = u.id AND us_flt.skill_id = ?
      )`);
      params.push(parseInt(skill_id, 10));
    }

    if (min_proficiency) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM user_skills us_prof
        WHERE us_prof.user_id = u.id AND us_prof.proficiency >= ?
        ${skill_id ? 'AND us_prof.skill_id = ?' : ''}
      )`);
      params.push(parseInt(min_proficiency, 10));
      if (skill_id) params.push(parseInt(skill_id, 10));
    }

    if (college && college.trim()) {
      whereClauses.push('u.college = ?');
      params.push(college.trim());
    }

    if (branch && branch.trim()) {
      whereClauses.push('u.branch = ?');
      params.push(branch.trim());
    }

    if (graduation_year) {
      whereClauses.push('u.graduation_year = ?');
      params.push(parseInt(graduation_year, 10));
    }

    if (location && location.trim()) {
      whereClauses.push('u.location LIKE ?');
      params.push(`%${location.trim()}%`);
    }

    if (has_service === 'true') {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM services svc
        JOIN user_skills us_svc ON svc.user_skill_id = us_svc.id
        WHERE us_svc.user_id = u.id AND svc.is_active = TRUE
      )`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereSQL}`,
      params
    );
    const total = countRows[0].total;

    // Discovery Ranking Query with SQL calculations
    let orderBySQL = 'relevance_score DESC, total_endorsements DESC, u.created_at DESC';
    if (sort_by === 'endorsements') {
      orderBySQL = 'total_endorsements DESC, avg_endorsement_rating DESC';
    } else if (sort_by === 'proficiency') {
      orderBySQL = 'max_proficiency DESC, total_endorsements DESC';
    } else if (sort_by === 'newest') {
      orderBySQL = 'u.created_at DESC';
    }

    const selectQuery = `
      SELECT u.id, u.username, u.full_name, u.profile_picture, u.college, u.branch, u.graduation_year, u.bio, u.location, u.created_at,
             COALESCE(COUNT(DISTINCT us.id), 0) as skill_count,
             COALESCE(MAX(us.proficiency), 0) as max_proficiency,
             COALESCE(COUNT(DISTINCT e.id), 0) as total_endorsements,
             COALESCE(AVG(e.rating), 0) as avg_endorsement_rating,
             COALESCE(COUNT(DISTINCT svc.id), 0) as service_count,
             (
               SELECT COUNT(*)
               FROM connections c1
               JOIN connections c2 ON (
                 (c1.requester_id = c2.requester_id AND c1.receiver_id <> c2.receiver_id) OR
                 (c1.requester_id = c2.receiver_id AND c1.receiver_id <> c2.requester_id) OR
                 (c1.receiver_id = c2.requester_id AND c1.requester_id <> c2.receiver_id) OR
                 (c1.receiver_id = c2.receiver_id AND c1.requester_id <> c2.requester_id)
               )
               WHERE (c1.requester_id = ? OR c1.receiver_id = ?)
                 AND (c2.requester_id = u.id OR c2.receiver_id = u.id)
                 AND c1.status = 'accepted' AND c2.status = 'accepted'
             ) as mutual_connections,
             (
               CASE WHEN ? > 0 AND u.college = (SELECT college FROM users WHERE id = ?) THEN 15 ELSE 0 END +
               (COALESCE(COUNT(DISTINCT e.id), 0) * 10) +
               (COALESCE(AVG(e.rating), 0) * 5) +
               (COALESCE(COUNT(DISTINCT svc.id), 0) * 8) +
               (CASE WHEN u.bio IS NOT NULL THEN 5 ELSE 0 END) +
               (CASE WHEN u.profile_picture IS NOT NULL THEN 5 ELSE 0 END)
             ) as relevance_score
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN endorsements e ON u.id = e.to_user_id
      LEFT JOIN services svc ON svc.user_skill_id = us.id AND svc.is_active = TRUE
      ${whereSQL}
      GROUP BY u.id
      ORDER BY ${orderBySQL}
      LIMIT ? OFFSET ?
    `;

    const fullParams = [viewerId, viewerId, viewerId, viewerId, ...params, limitVal, offset];
    const [users] = await pool.query(selectQuery, fullParams);

    // Fetch top skills for each returned user
    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      const [topSkills] = await pool.query(
        `SELECT us.user_id, s.id as skill_id, s.name as skill_name, us.proficiency,
                COUNT(e.id) as endorsements_count
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         LEFT JOIN endorsements e ON e.to_user_id = us.user_id AND e.skill_id = s.id
         WHERE us.user_id IN (?)
         GROUP BY us.id, s.id
         ORDER BY us.proficiency DESC, endorsements_count DESC`,
        [userIds]
      );

      const skillMap = {};
      topSkills.forEach(s => {
        if (!skillMap[s.user_id]) skillMap[s.user_id] = [];
        if (skillMap[s.user_id].length < 4) {
          skillMap[s.user_id].push(s);
        }
      });

      users.forEach(u => {
        u.skills = skillMap[u.id] || [];
        // Explainable "Why this result" tag
        const whyReasons = [];
        if (u.mutual_connections > 0) whyReasons.push(`${u.mutual_connections} mutual connection${u.mutual_connections > 1 ? 's' : ''}`);
        if (u.total_endorsements > 0) whyReasons.push(`${u.total_endorsements} peer endorsement${u.total_endorsements > 1 ? 's' : ''}`);
        if (u.service_count > 0) whyReasons.push('Available for booking');
        if (whyReasons.length === 0) whyReasons.push('Active profile');
        u.why_reason = whyReasons.join(' • ');
      });
    }

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
    console.error('[DiscoverUsers Controller Error]:', error);
    next(error);
  }
};
