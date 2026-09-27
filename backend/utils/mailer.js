/**
 * Development & Production Mailer Helper
 * In local development, logs password reset links directly to console.
 */
export const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  console.log('====================================================');
  console.log(`[PASSWORD RESET EMAIL] To: ${toEmail}`);
  console.log(`[RESET LINK] ${resetUrl}`);
  console.log('Link is valid for 15 minutes.');
  console.log('====================================================');
  return true;
};
