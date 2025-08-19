import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';

const socket = io('http://localhost:5000', { autoConnect: false });

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
      localStorage.removeItem('token');
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) return;
      const res = await axios.get('http://localhost:5000/api/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Could not fetch notifications", err);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setAuthToken(storedToken);
      try {
        const res = await axios.get('http://localhost:5000/api/auth');
        setUser(res.data);
        setIsAuthenticated(true);
        socket.connect();
        await fetchNotifications();
      } catch (err) {
        setAuthToken(null);
      }
    }
    setLoading(false);
  }, [fetchNotifications]);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    const handleConnect = () => { if (user) socket.emit('addUser', user.user_id); };
    socket.on('connect', handleConnect);
    socket.on('new_notification', fetchNotifications);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_notification', fetchNotifications);
    };
  }, [user, fetchNotifications]);

  const login = async (email, password) => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const body = JSON.stringify({ email, password });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', body, config);
      setAuthToken(res.data.token);
      await loadUser();
      return jwtDecode(res.data.token).user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setNotifications([]);
    setUnreadCount(0);
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout, notifications, unreadCount, fetchNotifications }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;