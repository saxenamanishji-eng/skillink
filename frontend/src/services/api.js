const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Centralized API client wrapper using Fetch API
 * Automatically includes credentials (cookies) and handles JSON parsing and server error propagation
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Accept': 'application/json'
  };

  // Don't set Content-Type if sending FormData (let browser set multipart/form-data boundary)
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include' // Send httpOnly cookies
  };

  if (config.body && !(config.body instanceof FormData) && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    console.error('[Network Error]:', netErr);
    throw new Error('Unable to connect to SkillLink server. Please check your network connection or server status.');
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { success: response.ok, message: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data && data.message ? data.message : `Server returned HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
