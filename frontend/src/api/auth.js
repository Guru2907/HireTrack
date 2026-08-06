import axiosClient from './axiosClient';

export const signup = (data) => axiosClient.post("/auth/signup", data);
export const login = (data) => axiosClient.post("/auth/login", data);
export const updateProfile = (data) => axiosClient.put('/auth/profile', data);
export const changePassword = (data) => axiosClient.put('/auth/password', data);