export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_REGEX = /^https:\/\/[^\s]+$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  return USERNAME_REGEX.test(username.toLowerCase());
};

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.toLowerCase());
};

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
};

export const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const start = startTime.length === 5 ? `${startTime}:00` : startTime;
  const end = endTime.length === 5 ? `${endTime}:00` : endTime;
  return end > start;
};
