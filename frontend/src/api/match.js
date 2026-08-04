import axiosClient from './axiosClient';
export const matchResume = (data) => axiosClient.post("/match", data);