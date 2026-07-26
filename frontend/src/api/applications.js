import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const headers = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

export const getAllApplications = () => axios.get(`${BASE}/applications`, headers());
export const createApplication = (data) => axios.post(`${BASE}/applications`, data, headers());
export const updateApplication = (id, data) => axios.put(`${BASE}/applications/${id}`, data, headers());
export const deleteApplication = (id) => axios.delete(`${BASE}/applications/${id}`, headers());
