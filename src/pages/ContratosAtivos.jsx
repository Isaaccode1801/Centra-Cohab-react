import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { CheckCircle2 } from 'lucide-react';
import { ParentSize } from '@visx/responsive';
import { DoubleDonutChart } from '../components/DoubleDonutChart';

export const ContratosAtivos = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/ativos');
        
        const validData = response.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          tipologia: item.tipologia || 'Não Informado'
        })).filter(item => item.aluguelNum > 0);
        
        setData(validData);
      } catch (err) {
        setError('Falha ao carregar dados de contratos ativos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  // KPIs
  const contratosQtd = data.length;
  const vglTotal = data.reduce((acc, curr) => acc + curr.aluguelNum, 0);
  const ticketMedio = contratosQtd > 0 ? vglTotal / contratosQtd : 0;

  // Formatters
  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Pie Chart Data (Tipologia)
  const tipologiaResumo = data.reduce((acc, curr) => {
    const tipo = curr.tipologia;
    if (!acc[tipo]) acc[tipo] = { qtd: 0, vgl: 0 };
    acc[tipo].qtd += 1;
    acc[tipo].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const pieDataQtd = Object.entries(tipologiaResumo).map(([id, info]) => ({
    id, label: id, value: info.qtd
  }));
  
  const pieDataVgl = Object.entries(tipologiaResumo).map(([id, info]) => ({
    id, label: id, value: info.vgl
  }));

  const commonTheme = {
    axis: {
      ticks: { text: { fill: 'var(--text-secondary)' } },
      legend: { text: { fill: 'var(--text-primary)', fontSize: 13, fontWeight: 500 } }
    },
    grid: { line: { stroke: 'var(--border-color)', strokeWidth: 1 } },
    tooltip: { container: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' } }
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><CheckCircle2 size={24} /> Contratos Ativos</h1>
        <p className="subtitle">Visão consolidada da carteira de contratos ativos na base.</p>
      </header>

      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Carregando dados da carteira...</p></div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="metrics-row">
            <div className="metric-card glass-panel">
              <span className="metric-label">Contratos Ativos</span>
              <span className="metric-value" style={{ color: '#60a5fa', textShadow: '0 0 10px rgba(96, 165, 250, 0.4)' }}>{formatMilhar(contratosQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ border: '1px solid rgba(59, 130, 246, 0.4)', boxShadow: '0 0 20px rgba(59, 130, 246, 0.15), inset 0 0 15px rgba(59, 130, 246, 0.1)', background: 'linear-gradient(135deg, rgba(0, 0, 30, 0.6) 0%, rgba(0, 0, 10, 0.8) 100%)' }}>
              <span className="metric-label" style={{ color: '#bfdbfe' }}>VGL Ativo</span>
              <span className="metric-value" style={{ color: '#3b82f6', textShadow: '0 0 15px rgba(59, 130, 246, 0.9), 0 0 30px rgba(59, 130, 246, 0.5)', background: 'linear-gradient(to right, #60a5fa, #bfdbfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: '800' }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value" style={{ color: '#93c5fd', textShadow: '0 0 10px rgba(147, 197, 253, 0.3)' }}>{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2" style={{ gridTemplateColumns: '1fr' }}>
            <div className="chart-wrapper glass-panel">
              <h3>Distribuição por Tipologia (Qtd externa, VGL interno)</h3>
              <div className="pie-container">
                <ParentSize>
                  {({ width, height }) => (
                    <DoubleDonutChart
                      width={width}
                      height={height}
                      outerData={pieDataQtd}
                      innerData={pieDataVgl}
                      formatOuterLabel={(v, isExpanded) => isExpanded ? formatMilhar(v) : formatMilhar(v)}
                      formatInnerLabel={(v, isExpanded) => {
                        const n = Number(v);
                        if (isExpanded) return formatMoeda(n);
                        if (n >= 1000000) return `${(n/1000000).toFixed(1).replace('.',',')} M`;
                        if (n >= 1000) return `${(n/1000).toFixed(1).replace('.',',')} K`;
                        return formatMilhar(n);
                      }}
                      outerColorRange={['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']}
                      innerColorRange={['#172554', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd']}
                    />
                  )}
                </ParentSize>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
