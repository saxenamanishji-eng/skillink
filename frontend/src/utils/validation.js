export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUsername = (username) => {
  return username && USERNAME_REGEX.test(username.toLowerCase());
};

export const validateEmail = (email) => {
  return email && EMAIL_REGEX.test(email.toLowerCase());
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};
