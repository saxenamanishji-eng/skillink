import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import endorsementRoutes from './routes/endorsementRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import helpdeskRoutes from './routes/helpdeskRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import discoverRoutes from './routes/discoverRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedFrontendOrigins = new Set([
  FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(',').map(origin => origin.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

// Middlewares
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedFrontendOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for public avatar pictures ONLY (Attachments are served authenticated)
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'SkillLink REST API',
    database: 'MySQL 8.0'
  });
});

// Mount domain routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/endorsements', endorsementRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Not Found Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: [${req.method}] ${req.originalUrl}`
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SkillLink Backend API listening on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🌐 Allowed Frontend Origin: ${FRONTEND_URL}`);
  console.log(`====================================================`);
});
