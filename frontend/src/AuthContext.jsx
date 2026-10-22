import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import api from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const IDLE_MINUTES = 15; // automatic session timeout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('hms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const timer = useRef(null);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    sessionStorage.setItem('hms_token', data.token);
    sessionStorage.setItem('hms_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch (_) { /* ignore */ }
    sessionStorage.removeItem('hms_token');
    sessionStorage.removeItem('hms_user');
    setUser(null);
  }, []);

  // Log out after 15 minutes without any mouse / keyboard activity.
  useEffect(() => {
    if (!user) return undefined;
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(logout, IDLE_MINUTES * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(timer.current);
    };
  }, [user, logout]);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
