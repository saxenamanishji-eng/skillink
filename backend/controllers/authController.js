import pool from '../config/db.js';
import { hashPassword, comparePassword, signToken, generateResetToken, hashResetToken } from '../utils/auth.js';
import { validateUsername, validateEmail, validatePassword } from '../utils/validation.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { toPublicProfile } from '../utils/serializer.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { username, full_name, email, password, college, branch, graduation_year, bio, location, phone } = req.body;

    // Strict validation
    if (!username || !validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3 to 30 lowercase alphanumeric characters or underscores (^[a-z0-9_]{3,30}$).'
      });
    }
    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || !validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    await connection.beginTransaction();

    // Check unique username and email
    const [existing] = await connection.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      await connection.rollback();
      if (existing[0].username.toLowerCase() === cleanUsername) {
        return res.status(409).json({ success: false, message: 'That username is already taken. Please choose another.' });
      }
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const password_hash = await hashPassword(password);
    const gradYear = graduation_year ? parseInt(graduation_year, 10) : null;

    const [insertResult] = await connection.query(
      `INSERT INTO users (username, full_name, email, password_hash, college, branch, graduation_year, bio, location, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active')`,
      [cleanUsername, full_name.trim(), cleanEmail, password_hash, college || null, branch || null, gradYear, bio || null, location || null]
    );

    const newUserId = insertResult.insertId;

    // Insert into user_private
    if (phone) {
      await connection.query(
        'INSERT INTO user_private (user_id, phone) VALUES (?, ?)',
        [newUserId, phone.trim()]
      );
    } else {
      await connection.query('INSERT INTO user_private (user_id, phone) VALUES (?, NULL)', [newUserId]);
    }

    await connection.commit();

    const token = signToken(newUserId);

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newUserId]);
    const safeUser = toPublicProfile(userRows[0], newUserId, false);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: safeUser
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Register Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const [rows] = await pool.query(
      `SELECT u.*, p.phone FROM users u
       LEFT JOIN user_private p ON u.id = p.user_id
       WHERE u.username = ? OR u.email = ? LIMIT 1`,
      [cleanIdentifier, cleanIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const user = rows[0];

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account has been suspended by an administrator.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'This account is currently inactive.' });
    }

    const token = signToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const safeUser = toPublicProfile(user, user.id, user.role === 'admin');

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('[Login Controller Error]:', error);
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, p.phone FROM users u
       LEFT JOIN user_private p ON u.id = p.user_id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const safeUser = toPublicProfile(rows[0], req.user.id, req.user.role === 'admin');
    return res.status(200).json({ success: true, user: safeUser });
  } catch (error) {
    console.error('[GetMe Controller Error]:', error);
    next(error);
  }
};

/**
 * Forgot password request
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: 'If an account exists with that email address, password reset instructions have been generated.'
    };

    if (!email || !validateEmail(email)) {
      return res.status(200).json(genericResponse);
    }

    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT id, username, email FROM users WHERE email = ? LIMIT 1', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(200).json(genericResponse);
    }

    const user = rows[0];
    const { rawToken, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('[ForgotPassword Controller Error]:', error);
    next(error);
  }
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid or missing password reset token.' });
    }

    if (!newPassword || !validatePassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const tokenHash = hashResetToken(token);

    await connection.beginTransaction();

    const [tokenRows] = await connection.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid, expired, or has already been used. Please request a new one.'
      });
    }

    const resetRecord = tokenRows[0];
    const newHash = await hashPassword(newPassword);

    await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, resetRecord.user_id]
    );

    await connection.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [resetRecord.id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated. You may now log in with your new password.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[ResetPassword Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};
