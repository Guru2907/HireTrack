import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const headers = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

// TODO — Phase 4: body shape is { resumeText, jobDescription }
export const matchResume = (data) => axios.post(`${BASE}/match`, data, headers());
