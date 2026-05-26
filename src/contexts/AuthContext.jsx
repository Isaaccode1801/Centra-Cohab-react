import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [autenticado, setAutenticado] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [acesso, setAcesso] = useState(null);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BACKEND || 'http://localhost:8000',
  });

  // Interceptor para injetar o Token automaticamente
  api.interceptors.request.use((config) => {
    const token = accessToken || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }, (error) => {
    return Promise.reject(error);
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAccessToken(token);
      setAutenticado(true);
    }
    setLoading(false);
  }, []);

  const login = async (password) => {
    try {
      const response = await api.post('/login', { password });
      const data = response.data;
      
      setAccessToken(data.access_token);
      setAcesso(data.acesso);
      setAutenticado(true);
      
      localStorage.setItem('access_token', data.access_token);
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao conectar no servidor' };
    }
  };

  const logout = () => {
    setAccessToken(null);
    setAcesso(null);
    setAutenticado(false);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ autenticado, accessToken, acesso, login, logout, loading, api }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
