import axios from 'axios';

// Base URL from env for deployment; fallback to localhost during dev
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL });

// Attach JWT for admin routes automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sq_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
