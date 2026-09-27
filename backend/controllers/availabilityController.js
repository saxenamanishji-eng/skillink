import pool from '../config/db.js';
import { validateTimeRange } from '../utils/validation.js';

/**
 * Get availability schedule for a user (or current user)
 * GET /api/availability?user_id=123
 */
export const getAvailability = async (req, res, next) => {
  try {
    const targetUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : req.user.id;

    const [rows] = await pool.query(
      `SELECT id, provider_id, day_of_week, start_time, end_time, is_available
       FROM availability
       WHERE provider_id = ?
       ORDER BY day_of_week ASC, start_time ASC`,
      [targetUserId]
    );

    return res.status(200).json({ success: true, availability: rows });
  } catch (error) {
    console.error('[GetAvailability Controller Error]:', error);
    next(error);
  }
};

/**
 * Add an availability time slot
 * POST /api/availability
 */
export const addAvailabilitySlot = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const { day_of_week, start_time, end_time } = req.body;

    const day = parseInt(day_of_week, 10);
    if (isNaN(day) || day < 0 || day > 6) {
      return res.status(400).json({ success: false, message: 'Day of week must be between 0 (Sunday) and 6 (Saturday).' });
    }

    if (!start_time || !end_time || !validateTimeRange(start_time, end_time)) {
      return res.status(400).json({ success: false, message: 'Invalid time range: End time must be strictly after start time.' });
    }

    const formattedStart = start_time.length === 5 ? `${start_time}:00` : start_time;
    const formattedEnd = end_time.length === 5 ? `${end_time}:00` : end_time;

    // Check for overlapping slots on the same day for this provider
    const [overlap] = await pool.query(
      `SELECT id FROM availability
       WHERE provider_id = ? AND day_of_week = ?
         AND NOT (end_time <= ? OR start_time >= ?)`,
      [providerId, day, formattedStart, formattedEnd]
    );

    if (overlap.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This time slot overlaps with an existing availability window on the same day.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO availability (provider_id, day_of_week, start_time, end_time, is_available)
       VALUES (?, ?, ?, ?, TRUE)`,
      [providerId, day, formattedStart, formattedEnd]
    );

    return res.status(201).json({
      success: true,
      message: 'Availability slot added successfully.',
      slotId: result.insertId
    });
  } catch (error) {
    console.error('[AddAvailabilitySlot Controller Error]:', error);
    next(error);
  }
};

/**
 * Delete an availability time slot
 * DELETE /api/availability/:id
 */
export const deleteAvailabilitySlot = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const slotId = parseInt(req.params.id, 10);

    const [result] = await pool.query(
      'DELETE FROM availability WHERE id = ? AND provider_id = ?',
      [slotId, providerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Availability slot not found.' });
    }

    return res.status(200).json({ success: true, message: 'Availability slot removed.' });
  } catch (error) {
    console.error('[DeleteAvailabilitySlot Controller Error]:', error);
    next(error);
  }
};
