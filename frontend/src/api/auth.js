import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const signup = (data) => axios.post(`${BASE}/auth/signup`, data);
export const login = (data) => axios.post(`${BASE}/auth/login`, data);
