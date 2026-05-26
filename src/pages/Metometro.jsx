import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Rocket } from 'lucide-react';
import './Metometro.css';

const VGL_BASE = 2763239.57;

export const Metometro = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/ativos');
        setData(response.data);
      } catch (err) {
        setError('Falha ao carregar dados do metômetro.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Calculando Metômetro...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  const ativosValidos = data.filter(item => item.aluguel);
  const vglAtivo = ativosValidos.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);
  
  const crescimento = ((vglAtivo - VGL_BASE) / VGL_BASE) * 100;
  
  // Formatters
  const formatMoeda = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPerc = (val) => `${val.toFixed(2).replace('.', ',')}%`;

  // Calculate progress for CSS
  // Let's cap max visual progress at 40% for the gauge
  const visualProgress = Math.min(Math.max(crescimento, 0), 40) / 40 * 100;

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><Rocket size={24} /> Metômetro</h1>
        <p className="subtitle">Acompanhamento do crescimento da carteira baseado no VGL ativo.</p>
      </header>

      <div className="metometro-container glass-panel">
        <div className="metometro-header">
          <div className="metometro-value-large gradient-text">
            {formatPerc(crescimento)}
          </div>
          <div className="vgl-info">
            VGL Base: <strong>{formatMoeda(VGL_BASE)}</strong> <br/>
            VGL Atual: <strong className="highlight-text">{formatMoeda(vglAtivo)}</strong>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${visualProgress}%` }}>
            <div className="progress-glow"></div>
          </div>
          
          <div className="milestone" style={{ left: `${(25 / 40) * 100}%` }}>
            <div className="milestone-marker"></div>
            <div className="milestone-label">25%<br/>1x salário</div>
          </div>
          
          <div className="milestone" style={{ left: `${(30 / 40) * 100}%` }}>
            <div className="milestone-marker"></div>
            <div className="milestone-label">30%<br/>2x salário</div>
          </div>
          
          <div className="milestone" style={{ left: `${(35 / 40) * 100}%` }}>
            <div className="milestone-marker"></div>
            <div className="milestone-label">35%<br/>3x salário</div>
          </div>
        </div>

        <div className="metas-info">
          <div className="meta-item">
            <span className="meta-badge">Meta 1</span>
            <span>Janeiro a Fevereiro</span>
          </div>
          <div className="meta-item">
            <span className="meta-badge">Meta 2</span>
            <span>Janeiro a Abril</span>
          </div>
          <div className="meta-item">
            <span className="meta-badge">Meta 3</span>
            <span>Janeiro a Junho</span>
          </div>
        </div>
      </div>
    </div>
  );
};
