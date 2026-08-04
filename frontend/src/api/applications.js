import axiosClient from './axiosClient';

export const getAllApplications = () => axiosClient.get('/applications');
export const createApplication = (data) => axiosClient.post('/applications', data);
export const updateApplication = (id, data) => axiosClient.put(`/applications/${id}`, data);
export const deleteApplication = (id) => axiosClient.delete(`/applications/${id}`);