import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const headers = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

export const getResumes = () => axios.get(`${BASE}/resumes`, headers());
export const addResume = (data) => axios.post(`${BASE}/resumes`, data, headers());
export const deleteResume = (id) => axios.delete(`${BASE}/resumes/${id}`, headers());