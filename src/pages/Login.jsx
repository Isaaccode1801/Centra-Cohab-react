import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/performance logo horizontal (1).png';
import './Login.css';

export const Login = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, autenticado } = useAuth();
  const navigate = useNavigate();

  if (autenticado) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError('');

    const result = await login(password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box glass-panel animate-fade-in">
        <div className="login-logo-container">
          <img src={logoImg} alt="Performance Logo" className="login-logo-img animate-pulse-glow" />
        </div>
        <h1 className="login-title">
          Bem-vindo
        </h1>
        <p className="login-subtitle">
          Digite a palavra mágica para liberar seu acesso aos relatórios avançados de segmentação.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Palavra Mágica"
              className="login-input"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-submit-btn" disabled={isLoading || !password}>
            {isLoading ? 'Autenticando...' : 'Entrar na Central'}
          </button>
        </form>
      </div>

      {/* Decorative background elements */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
    </div>
  );
};
