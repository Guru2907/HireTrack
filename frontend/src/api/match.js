import axiosClient from './axiosClient';

// The server may retry and switch to a backup AI provider inside this one request (bounded at about
// 50 s), so this call gets its own timeout with headroom. Other endpoints keep the client default.
export const MATCH_TIMEOUT_MS = 75000;

export const matchResume = (data) => axiosClient.post("/match", data, { timeout: MATCH_TIMEOUT_MS });
