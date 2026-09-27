import pool from '../config/db.js';

/**
 * Submit a review for a completed booking
 * POST /api/reviews
 */
export const createReview = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const reviewerId = req.user.id;
    const { booking_id, rating, comment } = req.body;

    const bookingId = parseInt(booking_id, 10);
    const ratingVal = parseInt(rating, 10);

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Valid booking ID is required.' });
    }

    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Star rating must be an integer between 1 and 5.' });
    }

    await connection.beginTransaction();

    // Verify booking
    const [bookingRows] = await connection.query(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );

    if (bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRows[0];

    // Verify customer owns the booking
    if (booking.customer_id !== reviewerId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Only the customer who booked this session can submit a review.' });
    }

    // Verify booking status is completed
    if (booking.status !== 'completed') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Reviews can only be submitted for completed sessions. Current booking status is "${booking.status}".`
      });
    }

    // Check if review already exists for this booking
    const [existingReview] = await connection.query('SELECT id FROM reviews WHERE booking_id = ?', [bookingId]);
    if (existingReview.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'A review has already been submitted for this booking.' });
    }

    // Insert review
    const [insertResult] = await connection.query(
      `INSERT INTO reviews (booking_id, reviewer_id, provider_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [bookingId, reviewerId, booking.provider_id, ratingVal, comment ? comment.trim() : null]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      reviewId: insertResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateReview Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};
