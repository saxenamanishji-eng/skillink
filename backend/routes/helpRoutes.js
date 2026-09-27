import express from 'express';
import { getArticles, getArticleBySlug } from '../controllers/helpController.js';

const router = express.Router();

router.get('/articles', getArticles);
router.get('/articles/:slug', getArticleBySlug);

export default router;
