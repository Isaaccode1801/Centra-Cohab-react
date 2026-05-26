import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { CheckCircle2 } from 'lucide-react';

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
        <>
          <div className="metrics-row">
            <div className="metric-card glass-panel">
              <span className="metric-label">Contratos Ativos</span>
              <span className="metric-value">{formatMilhar(contratosQtd)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">VGL Ativo</span>
              <span className="metric-value highlight">{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value">{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Distribuição por Tipologia (Qtd)</h3>
              <div className="pie-container">
                <ResponsivePie
                  data={pieDataQtd}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={4}
                  colors={['#0ea5e9', '#38bdf8', '#7dd3fc']}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsTextColor="var(--text-primary)"
                  arcLabelsTextColor="#fff"
                  theme={commonTheme}
                  valueFormat={v => formatMilhar(v)}
                />
              </div>
            </div>
            
            <div className="chart-wrapper glass-panel">
              <h3>Distribuição por Tipologia (VGL)</h3>
              <div className="pie-container">
                <ResponsivePie
                  data={pieDataVgl}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={4}
                  colors={['#0284c7', '#0369a1', '#075985']}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsTextColor="var(--text-primary)"
                  arcLabelsTextColor="#fff"
                  theme={commonTheme}
                  valueFormat={v => formatMoeda(v)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
