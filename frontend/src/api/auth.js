import axiosClient from './axiosClient';

export const signup = (data) => axiosClient.post("/auth/signup", data);
export const login = (data) => axiosClient.post("/auth/login", data);