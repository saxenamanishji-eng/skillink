import pool from '../config/db.js';

/**
 * Get published help articles with optional category filter or search query
 * GET /api/help/articles
 */
export const getArticles = async (req, res, next) => {
  try {
    const { category, search } = req.query;

    let query = `
      SELECT id, title, slug, category, created_at, published_at
      FROM help_articles
      WHERE status = 'published'
    `;
    const params = [];

    if (category && category.trim()) {
      query += ' AND category = ?';
      params.push(category.trim());
    }

    if (search && search.trim()) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY published_at DESC, title ASC';

    const [articles] = await pool.query(query, params);
    const [categories] = await pool.query('SELECT DISTINCT category FROM help_articles WHERE status = "published" ORDER BY category ASC');

    return res.status(200).json({
      success: true,
      articles,
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('[GetArticles Controller Error]:', error);
    next(error);
  }
};

/**
 * Get single published article by slug
 * GET /api/help/articles/:slug
 */
export const getArticleBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `SELECT a.*, u.full_name as author_name
       FROM help_articles a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.slug = ? AND a.status = 'published'`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.status(200).json({ success: true, article: rows[0] });
  } catch (error) {
    console.error('[GetArticleBySlug Controller Error]:', error);
    next(error);
  }
};
