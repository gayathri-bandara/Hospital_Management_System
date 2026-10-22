// One axios instance used by every page. It adds the login token automatically.
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says "not logged in" (token expired), go back to the login page.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLogin) {
      sessionStorage.removeItem('hms_token');
      sessionStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errorText = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.message || fallback;

export default api;
