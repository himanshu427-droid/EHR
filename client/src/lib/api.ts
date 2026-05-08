import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

// 1. Create a re-usable 'api' client
export const api = axios.create({
  baseURL: resolveApiUrl('/api'), // All requests will be prefixed with /api
});

// 2. This is the "interceptor"
// It runs before *every* request and automatically adds the auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token'); // Use your correct key
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`; // Add it to the header
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. This interceptor makes error handling consistent
// It returns the error message from your backend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Pass the backend's error message to react-query's "error" object
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);



// 4. Keep your multipart header function for file uploads
export function getMultipartAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
