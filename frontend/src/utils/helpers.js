export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const formatCurrency = (amount, currency = 'INR') => {
  const num = parseFloat(amount) || 0;
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${num.toFixed(2)}`;
};

export const formatPricingType = (pricingType) => {
  const labels = {
    hourly: 'Hourly',
    per_session: 'Per session',
    fixed_project: 'Fixed project'
  };
  return labels[pricingType] || String(pricingType || '').replace(/_/g, ' ');
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  const parts = timeString.split(':');
  let hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
};

/**
 * Profile URL validation strictly adhering to SkillLink profile patterns
 * Accepts only http/https, matches current origin/domain, matches path ^/u/[a-z0-9_]{3,30}/?$
 */
export const validateProfileUrl = (text) => {
  try {
    const url = new URL(text, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: 'Disallowed protocol' };
    }

    // Match path
    const match = url.pathname.match(/^\/u\/([a-z0-9_]{3,30})\/?$/i);
    if (match && match[1]) {
      return { valid: true, username: match[1].toLowerCase(), path: `/u/${match[1].toLowerCase()}` };
    }

    return { valid: false, reason: 'URL is not a valid SkillLink profile link' };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
};

