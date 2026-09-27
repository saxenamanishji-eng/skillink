import express from 'express';
import {
  getAdminDashboard,
  getAdminUsers,
  updateAdminUserStatus,
  getAdminSkills,
  createAdminSkill,
  updateAdminSkill,
  deleteAdminSkill,
  getAdminServices,
  updateAdminServiceStatus,
  getAdminBookings,
  getAdminComplaints,
  resolveAdminComplaint,
  getAdminReports,
  resolveAdminReport,
  getAdminHelpdeskTickets,
  updateAdminHelpdeskStatus,
  getAdminReviews,
  deleteAdminReview,
  getAdminArticles,
  createAdminArticle,
  updateAdminArticle,
  deleteAdminArticle,
  getAdminAuditLogs,
  getAdminAnalytics
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

// Apply auth + admin check across all /api/admin routes
router.use(requireAuth, requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAdminUsers);
router.put('/users/:id/status', updateAdminUserStatus);

router.get('/skills', getAdminSkills);
router.post('/skills', createAdminSkill);
router.put('/skills/:id', updateAdminSkill);
router.delete('/skills/:id', deleteAdminSkill);

router.get('/services', getAdminServices);
router.put('/services/:id/status', updateAdminServiceStatus);

router.get('/bookings', getAdminBookings);

router.get('/complaints', getAdminComplaints);
router.put('/complaints/:id/resolve', resolveAdminComplaint);

router.get('/reports', getAdminReports);
router.put('/reports/:id/resolve', resolveAdminReport);

router.get('/helpdesk', getAdminHelpdeskTickets);
router.put('/helpdesk/:id/status', updateAdminHelpdeskStatus);

router.get('/reviews', getAdminReviews);
router.delete('/reviews/:id', deleteAdminReview);

router.get('/help-articles', getAdminArticles);
router.post('/help-articles', createAdminArticle);
router.put('/help-articles/:id', updateAdminArticle);
router.delete('/help-articles/:id', deleteAdminArticle);

router.get('/audit-logs', getAdminAuditLogs);
router.get('/analytics', getAdminAnalytics);

export default router;
