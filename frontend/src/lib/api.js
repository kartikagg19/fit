import axios from "axios";

import { mockData } from "./mock";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://fit-tggq.onrender.com";

export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// INTERCEPTOR FOR DEMO
api.interceptors.request.use((config) => {
  const url = config.url;
  
  if (url === "/auth/login" || url === "/auth/me") {
    return Promise.reject({ config, isMock: true, data: { id: "1", role: "owner", email: "aggarwalkartik688@gmail.com", name: "Kartik Aggarwal" } });
  }
  
  if (url.startsWith("/analytics/overview")) return Promise.reject({ config, isMock: true, data: mockData.overview });
  if (url.startsWith("/analytics/revenue-series")) return Promise.reject({ config, isMock: true, data: mockData.revenue });
  if (url.startsWith("/analytics/attendance-week")) return Promise.reject({ config, isMock: true, data: mockData.attendance });
  if (url.startsWith("/analytics/plan-distribution")) return Promise.reject({ config, isMock: true, data: mockData.plans });
  
  if (url.startsWith("/checkins")) return Promise.reject({ config, isMock: true, data: mockData.checkins });
  if (url.startsWith("/payments")) return Promise.reject({ config, isMock: true, data: mockData.payments });
  if (url.startsWith("/members")) return Promise.reject({ config, isMock: true, data: mockData.members });
  if (url.startsWith("/branches")) return Promise.reject({ config, isMock: true, data: mockData.branches });
  if (url.startsWith("/trainers")) return Promise.reject({ config, isMock: true, data: mockData.trainers });
  if (url.startsWith("/plans")) return Promise.reject({ config, isMock: true, data: mockData.plans });
  
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.isMock) {
      if (error.config.url.startsWith("/checkins") && error.config.method === "post") {
         return Promise.resolve({ data: { message: "Checked in successfully via Mock" }, status: 200 });
      }
      return Promise.resolve({ data: error.data, status: 200 });
    }
    return Promise.reject(error);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
