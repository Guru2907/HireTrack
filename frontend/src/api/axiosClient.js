import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: BASE,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response, 
  (error) => {
    // A 401 from login/signup means "wrong credentials", not "session expired": let the page show the message
    // instead of reloading it.
    const url = error.config?.url || '';
    const isAuthAttempt = url.startsWith('/auth/login') || url.startsWith('/auth/signup');
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error); 
  }
);

export default axiosClient;