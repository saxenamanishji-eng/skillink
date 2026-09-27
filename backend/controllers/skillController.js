import pool from '../config/db.js';

/**
 * Get all master skills with optional category filter or search query
 * GET /api/skills
 */
export const getSkills = async (req, res, next) => {
  try {
    const { search, category } = req.query;

    let query = `
      SELECT s.*, COUNT(DISTINCT us.user_id) as user_count, COUNT(DISTINCT e.id) as endorsement_count
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN endorsements e ON s.id = e.skill_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ' AND (s.name LIKE ? OR s.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category.trim()) {
      query += ' AND s.category = ?';
      params.push(category.trim());
    }

    query += ' GROUP BY s.id ORDER BY user_count DESC, s.name ASC';

    const [skills] = await pool.query(query, params);

    // Also get distinct categories
    const [categories] = await pool.query('SELECT DISTINCT category FROM skills WHERE category IS NOT NULL ORDER BY category ASC');

    return res.status(200).json({
      success: true,
      skills,
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('[GetSkills Controller Error]:', error);
    next(error);
  }
};

/**
 * Create or suggest a new skill
 * POST /api/skills
 */
export const createSkill = async (req, res, next) => {
  try {
    const { name, category, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Skill name is required.' });
    }

    const trimmedName = name.trim();
    const [existing] = await pool.query('SELECT * FROM skills WHERE name = ?', [trimmedName]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A skill with this name already exists.',
        skill: existing[0]
      });
    }

    const [result] = await pool.query(
      'INSERT INTO skills (name, category, description) VALUES (?, ?, ?)',
      [trimmedName, category ? category.trim() : 'General', description ? description.trim() : null]
    );

    const [newSkill] = await pool.query('SELECT * FROM skills WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Skill created successfully.',
      skill: newSkill[0]
    });
  } catch (error) {
    console.error('[CreateSkill Controller Error]:', error);
    next(error);
  }
};
