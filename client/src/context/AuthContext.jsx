import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mysubs_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mysubs_theme') || 'light';
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mysubs_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    const token = localStorage.getItem('mysubs_token');
    if (token) {
      api.me()
        .then(res => {
          setUser(res.user);
          localStorage.setItem('mysubs_user', JSON.stringify(res.user));
        })
        .catch(() => {
          localStorage.removeItem('mysubs_token');
          localStorage.removeItem('mysubs_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (identifier, password) => {
    const res = await api.login({ identifier, password });
    localStorage.setItem('mysubs_token', res.token);
    localStorage.setItem('mysubs_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('mysubs_token');
    localStorage.removeItem('mysubs_user');
    setUser(null);
  };

  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
