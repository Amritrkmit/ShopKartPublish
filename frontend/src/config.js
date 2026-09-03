// Centralized API Base URL configuration
const rawApiUrl = process.env.REACT_APP_API_BASE_URL || "";
export const API_BASE_URL = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;
