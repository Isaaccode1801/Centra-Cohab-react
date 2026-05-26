import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const { autenticado, acesso } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <h1>Bem-vindo à Central Cohab</h1>
        <p className="subtitle">Seu painel central de controle e inteligência de negócios.</p>
      </header>

      <div className="status-cards">
        <div className="glass-panel stat-card animate-fade-in">
          <h3>Status da Sessão</h3>
          <div className={`status-badge ${autenticado ? 'success' : 'warning'}`}>
            {autenticado ? 'Usuário Autenticado' : 'Usuário Não Autenticado'}
          </div>
          {acesso && <p className="access-info">Nível de acesso: {acesso}</p>}
        </div>
      </div>
    </div>
  );
};
