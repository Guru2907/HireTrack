import axiosClient from './axiosClient';

export const getResumes = () => axiosClient.get(`/resumes`);
export const addResume = (data) => axiosClient.post(`/resumes`, data);
export const deleteResume = (id) => axiosClient.delete(`/resumes/${id}`);
export const updateResume = (id,data) => axiosClient.put(`/resumes/${id}`,data)