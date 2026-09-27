export const errorHandler = (err, req, res, next) => {
  console.error('[Global Server Error]:', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack,
    code: err.code,
    errno: err.errno,
    sqlState: err.sqlState
  });

  // Handle MySQL Duplicate Entry Errors (ER_DUP_ENTRY / 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    if (err.message.includes('username')) {
      return res.status(409).json({ success: false, message: 'That username is already taken. Please choose another.' });
    }
    if (err.message.includes('email')) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    if (err.message.includes('uq_connection_pair') || err.message.includes('pair_key')) {
      return res.status(409).json({ success: false, message: 'A connection between these two users already exists.' });
    }
    if (err.message.includes('uq_user_skill')) {
      return res.status(409).json({ success: false, message: 'You have already added this skill to your profile.' });
    }
    if (err.message.includes('uq_endorsement')) {
      return res.status(409).json({ success: false, message: 'You have already endorsed this skill for this user.' });
    }
    if (err.message.includes('uq_provider_slot')) {
      return res.status(409).json({ success: false, message: 'This availability time slot already exists in your schedule.' });
    }
    if (err.message.includes('booking_id')) {
      return res.status(409).json({ success: false, message: 'A review has already been submitted for this booking.' });
    }
    return res.status(409).json({ success: false, message: 'A duplicate record conflict occurred with existing data.' });
  }

  // Handle MySQL Check Constraint Errors (ER_CHECK_CONSTRAINT_VIOLATED / 3819)
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
    if (err.message.includes('chk_no_self_connection')) {
      return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
    }
    if (err.message.includes('chk_no_self_endorsement')) {
      return res.status(400).json({ success: false, message: 'You cannot endorse your own skills.' });
    }
    if (err.message.includes('chk_no_self_booking')) {
      return res.status(400).json({ success: false, message: 'You cannot book your own service.' });
    }
    if (err.message.includes('chk_proficiency_range')) {
      return res.status(400).json({ success: false, message: 'Proficiency rating must be an integer between 1 and 10.' });
    }
    if (err.message.includes('chk_endorsement_rating')) {
      return res.status(400).json({ success: false, message: 'Endorsement rating must be an integer between 1 and 10.' });
    }
    if (err.message.includes('chk_review_rating')) {
      return res.status(400).json({ success: false, message: 'Review rating must be an integer between 1 and 5 stars.' });
    }
    if (err.message.includes('chk_availability_time') || err.message.includes('chk_booking_time_order')) {
      return res.status(400).json({ success: false, message: 'The end time must be after the start time.' });
    }
    return res.status(400).json({ success: false, message: 'Database validation check constraint was not satisfied.' });
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Uploaded file exceeds maximum allowed size (5MB).' });
    }
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An internal server error occurred while processing your request.';
  return res.status(statusCode).json({ success: false, message });
};
