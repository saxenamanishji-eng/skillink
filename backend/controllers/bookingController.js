import pool from '../config/db.js';
import { validateTimeRange } from '../utils/validation.js';

/**
 * Get user's bookings (as customer or provider)
 * GET /api/bookings
 */
export const getBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { role = 'all', status } = req.query; // role: 'as_customer', 'as_provider', or 'all'

    let query = `
      SELECT b.*,
             svc.title as service_title, svc.category as service_category, svc.pricing_type,
             c.username as customer_username, c.full_name as customer_name, c.profile_picture as customer_avatar,
             p.username as provider_username, p.full_name as provider_name, p.profile_picture as provider_avatar,
             r.id as review_id, r.rating as review_rating, r.comment as review_comment
      FROM bookings b
      JOIN services svc ON b.service_id = svc.id
      JOIN users c ON b.customer_id = c.id
      JOIN users p ON b.provider_id = p.id
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'as_customer') {
      query += ' AND b.customer_id = ?';
      params.push(userId);
    } else if (role === 'as_provider') {
      query += ' AND b.provider_id = ?';
      params.push(userId);
    } else {
      query += ' AND (b.customer_id = ? OR b.provider_id = ?)';
      params.push(userId, userId);
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.booking_date DESC, b.start_time DESC';

    const [bookings] = await pool.query(query, params);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('[GetBookings Controller Error]:', error);
    next(error);
  }
};

/**
 * Get booking details by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `SELECT b.*,
              svc.title as service_title, svc.category as service_category, svc.pricing_type,
              c.username as customer_username, c.full_name as customer_name, c.email as customer_email,
              p.username as provider_username, p.full_name as provider_name, p.email as provider_email,
              r.id as review_id, r.rating as review_rating, r.comment as review_comment
       FROM bookings b
       JOIN services svc ON b.service_id = svc.id
       JOIN users c ON b.customer_id = c.id
       JOIN users p ON b.provider_id = p.id
       LEFT JOIN reviews r ON r.booking_id = b.id
       WHERE b.id = ? AND (b.customer_id = ? OR b.provider_id = ? OR ? = 'admin')`,
      [bookingId, userId, userId, req.user.role]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or access denied.' });
    }

    return res.status(200).json({ success: true, booking: rows[0] });
  } catch (error) {
    console.error('[GetBookingById Controller Error]:', error);
    next(error);
  }
};

/**
 * Create a new booking request with double-booking prevention transaction (Section 8)
 * POST /api/bookings
 */
export const createBooking = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const customerId = req.user.id;
    const { service_id, booking_date, start_time, end_time, mode, notes } = req.body;

    const serviceId = parseInt(service_id, 10);
    if (!serviceId || isNaN(serviceId)) {
      return res.status(400).json({ success: false, message: 'Valid service ID is required.' });
    }

    if (!booking_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Booking date, start time, and end time are required.' });
    }

    if (!['online', 'in_person'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Mode must be either online or in_person.' });
    }

    if (!validateTimeRange(start_time, end_time)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    const formattedStart = start_time.length === 5 ? `${start_time}:00` : start_time;
    const formattedEnd = end_time.length === 5 ? `${end_time}:00` : end_time;

    // Check date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (booking_date < today) {
      return res.status(400).json({ success: false, message: 'Cannot schedule bookings for a past date.' });
    }

    await connection.beginTransaction();

    // Fetch service and provider details
    const [svcRows] = await connection.query(
      `SELECT svc.*, us.user_id as provider_id, u.status as provider_status, u.full_name as provider_name
       FROM services svc
       JOIN user_skills us ON svc.user_skill_id = us.id
       JOIN users u ON us.user_id = u.id
       WHERE svc.id = ? FOR UPDATE`,
      [serviceId]
    );

    if (svcRows.length === 0 || !svcRows[0].is_active || svcRows[0].provider_status !== 'active') {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'This service is currently unavailable or inactive.' });
    }

    const service = svcRows[0];
    const providerId = service.provider_id;

    if (customerId === providerId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You cannot book your own service offering.' });
    }

    if (mode === 'online' && !service.online_available) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Online delivery is not supported for this service.' });
    }
    if (mode === 'in_person' && !service.in_person_available) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'In-person delivery is not supported for this service.' });
    }

    // Step 1: Double-Booking Overlap Check with index-range locking (Section 8)
    const [existingOverlap] = await connection.query(
      `SELECT id, status FROM bookings
       WHERE provider_id = ? AND booking_date = ?
         AND status IN ('pending', 'confirmed')
         AND NOT (end_time <= ? OR start_time >= ?)
       FOR UPDATE`,
      [providerId, booking_date, formattedStart, formattedEnd]
    );

    const hasConfirmedOverlap = existingOverlap.some(b => b.status === 'confirmed');
    if (hasConfirmedOverlap) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available. The provider is already booked for this time window.'
      });
    }

    // Step 2: Insert booking with price snapshot (deliberate denormalization)
    const [insertResult] = await connection.query(
      `INSERT INTO bookings (service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, notes, price, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [serviceId, customerId, providerId, booking_date, formattedStart, formattedEnd, mode, notes ? notes.trim() : null, service.price, service.currency]
    );

    const bookingId = insertResult.insertId;

    // Step 3: Backstop verify-before-commit inside same transaction
    const [verifyOverlap] = await connection.query(
      `SELECT id FROM bookings
       WHERE provider_id = ? AND booking_date = ?
         AND id <> ?
         AND status = 'confirmed'
         AND NOT (end_time <= ? OR start_time >= ?)`,
      [providerId, booking_date, bookingId, formattedStart, formattedEnd]
    );

    if (verifyOverlap.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'A scheduling conflict occurred during confirmation. Please choose another time slot.'
      });
    }

    // Notification to provider
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
       VALUES (?, 'booking_request', 'New Booking Request Received', ?, ?, 'booking', ?)`,
      [providerId, `${req.user.full_name} requested a booking for "${service.title}" on ${booking_date} at ${start_time}.`, customerId, bookingId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Booking request sent to provider. Payment is arranged in cash directly with provider upon session delivery.',
      bookingId
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateBooking Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Provider responds to booking (confirm / reject)
 * PUT /api/bookings/:id/respond
 */
export const respondToBooking = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const providerId = req.user.id;
    const bookingId = parseInt(req.params.id, 10);
    const { action } = req.body; // 'confirm' or 'reject'

    if (!['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "confirm" or "reject".' });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT b.*, svc.title as service_title
       FROM bookings b
       JOIN services svc ON b.service_id = svc.id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    if (booking.provider_id !== providerId && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Only the designated service provider can respond to this booking.' });
    }

    // State machine check: must be pending
    if (booking.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid state transition: Cannot ${action} a booking that is currently "${booking.status}".`
      });
    }

    if (action === 'confirm') {
      // Check for any conflicting confirmed booking
      const [overlap] = await connection.query(
        `SELECT id FROM bookings
         WHERE provider_id = ? AND booking_date = ?
           AND id <> ?
           AND status = 'confirmed'
           AND NOT (end_time <= ? OR start_time >= ?)
         FOR UPDATE`,
        [providerId, booking.booking_date, bookingId, booking.start_time, booking.end_time]
      );

      if (overlap.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Cannot confirm: You already have another confirmed booking during this time slot.'
        });
      }

      await connection.query(
        'UPDATE bookings SET status = "confirmed", responded_at = NOW(), updated_at = NOW() WHERE id = ?',
        [bookingId]
      );

      // Notification to customer
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
         VALUES (?, 'booking_confirmed', 'Booking Confirmed!', ?, ?, 'booking', ?)`,
        [booking.customer_id, `Your booking for "${booking.service_title}" on ${booking.booking_date} has been confirmed.`, providerId, bookingId]
      );
    } else {
      // Reject
      await connection.query(
        'UPDATE bookings SET status = "rejected", responded_at = NOW(), updated_at = NOW() WHERE id = ?',
        [bookingId]
      );

      // Notification to customer
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
         VALUES (?, 'booking_rejected', 'Booking Declined', ?, ?, 'booking', ?)`,
        [booking.customer_id, `Your booking request for "${booking.service_title}" on ${booking.booking_date} was declined.`, providerId, bookingId]
      );
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: `Booking has been ${action === 'confirm' ? 'confirmed' : 'rejected'}.`
    });
  } catch (error) {
    await connection.rollback();
    console.error('[RespondToBooking Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Cancel a booking (by customer or provider)
 * PUT /api/bookings/:id/cancel
 */
export const cancelBooking = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT b.*, svc.title as service_title
       FROM bookings b
       JOIN services svc ON b.service_id = svc.id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];
    const isCustomer = booking.customer_id === userId;
    const isProvider = booking.provider_id === userId;

    if (!isCustomer && !isProvider && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this booking.' });
    }

    // State machine check: can only cancel if pending or confirmed
    if (!['pending', 'confirmed'].includes(booking.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid state transition: Cannot cancel a booking with status "${booking.status}".`
      });
    }

    await connection.query(
      'UPDATE bookings SET status = "cancelled", updated_at = NOW() WHERE id = ?',
      [bookingId]
    );

    // Notify the other party
    const targetUserId = isCustomer ? booking.provider_id : booking.customer_id;
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
       VALUES (?, 'booking_cancelled', 'Booking Cancelled', ?, ?, 'booking', ?)`,
      [targetUserId, `Booking for "${booking.service_title}" on ${booking.booking_date} was cancelled by ${req.user.full_name}.`, userId, bookingId]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Booking has been cancelled.' });
  } catch (error) {
    await connection.rollback();
    console.error('[CancelBooking Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Provider marks booking as completed
 * PUT /api/bookings/:id/complete
 */
export const completeBooking = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const providerId = req.user.id;
    const bookingId = parseInt(req.params.id, 10);

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT b.*, svc.title as service_title
       FROM bookings b
       JOIN services svc ON b.service_id = svc.id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = rows[0];

    if (booking.provider_id !== providerId && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Only the provider can mark this booking as completed.' });
    }

    if (booking.status !== 'confirmed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid state transition: Cannot mark a "${booking.status}" booking as completed. It must be "confirmed".`
      });
    }

    // Check date has arrived or passed
    const today = new Date().toISOString().split('T')[0];
    if (booking.booking_date > today) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot mark booking as completed prior to the scheduled date.'
      });
    }

    await connection.query(
      'UPDATE bookings SET status = "completed", completed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [bookingId]
    );

    // Notification to customer to review
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id)
       VALUES (?, 'booking_completed', 'Booking Completed — Leave a Review!', ?, ?, 'booking', ?)`,
      [booking.customer_id, `Your session for "${booking.service_title}" has been marked completed. Feel free to share your review!`, providerId, bookingId]
    );

    await connection.commit();
    return res.status(200).json({ success: true, message: 'Booking marked as completed successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('[CompleteBooking Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};
