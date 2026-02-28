import axios from 'axios';
import keycloak from '../auth/keycloak';

const api = axios.create({
  // Read backend URL from environment variable, with a fallback to localhost for development
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && keycloak.token) {
      try {
        await keycloak.updateToken(30);
        error.config.headers.Authorization = `Bearer ${keycloak.token}`;
        return axios.request(error.config);
      } catch (err) {
        keycloak.logout({ redirectUri: window.location.origin });
      }
    }
    return Promise.reject(error);
  }
);

export default api;