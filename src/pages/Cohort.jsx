import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Grid3X3, TrendingUp, TrendingDown, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './Cohort.css';

const getColorStyle = (value, tipo) => {
  // value is 0-100 (percentage)
  if (value === null || value === undefined || isNaN(value)) return { background: 'transparent', color: 'var(--text-secondary)' };

  if (tipo === 'Vacância') {
    // Blues: high = brighter blue, low = dark
    const alpha = Math.max(0.15, value / 100);
    if (value >= 80) return { background: `hsla(210, 100%, 55%, ${alpha})`, color: '#fff' };
    if (value >= 60) return { background: `hsla(210, 90%, 50%, ${alpha})`, color: '#fff' };
    if (value >= 40) return { background: `hsla(210, 80%, 45%, ${alpha})`, color: '#cce4ff' };
    if (value >= 20) return { background: `hsla(210, 70%, 35%, ${alpha})`, color: '#99ccff' };
    return { background: `hsla(210, 60%, 20%, ${alpha})`, color: '#7ab8ff' };
  } else {
    // Greens: high = brighter green, low = dark
    const alpha = Math.max(0.15, value / 100);
    if (value >= 80) return { background: `hsla(145, 80%, 42%, ${alpha})`, color: '#fff' };
    if (value >= 60) return { background: `hsla(145, 70%, 38%, ${alpha})`, color: '#d4f5e0' };
    if (value >= 40) return { background: `hsla(145, 60%, 30%, ${alpha})`, color: '#aeeac5' };
    if (value >= 20) return { background: `hsla(145, 55%, 22%, ${alpha})`, color: '#7dd3a8' };
    return { background: `hsla(145, 50%, 14%, ${alpha})`, color: '#52c47d' };
  }
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const percent = (value > 1 ? value : value * 100).toFixed(1);
  return `${percent.replace('.', ',')}%`;
};

const toPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return null;
  return value > 1 ? value : value * 100;
};

export const Cohort = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipoCohort, setTipoCohort] = useState('Vacância');
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint = tipoCohort === 'Vacância' ? '/cohort_vacancia' : '/cohort_vigencia';
        const response = await api.get(endpoint);

        const transformedData = response.data.map(item => {
          let cohortKey = Object.keys(item).find(key => key.includes('Cohort'));
          let cohortLabel = item[cohortKey] ? String(item[cohortKey]).replace('T', '') : 'Desconhecido';
          return { ...item, cohort_label: cohortLabel, cohort_key: cohortKey };
        });

        setData(transformedData);
      } catch (err) {
        setError(`Falha ao carregar dados de ${tipoCohort}.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, tipoCohort]);

  const monthColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0])
      .filter(key => !isNaN(Number(key)))
      .sort((a, b) => Number(a) - Number(b));
  }, [data]);

  const lastCol = monthColumns[monthColumns.length - 1];

  const avgRetention = useMemo(() => {
    if (!lastCol || data.length === 0) return null;
    const vals = data.map(r => toPercent(r[lastCol])).filter(v => v !== null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [data, lastCol]);

  const retentionTrend = useMemo(() => {
    if (!lastCol || data.length < 2) return null;
    const latest = toPercent(data[data.length - 1][lastCol]);
    const previous = toPercent(data[data.length - 2][lastCol]);
    if (latest === null || previous === null || previous === 0) return null;
    return ((latest - previous) / previous * 100).toFixed(1);
  }, [data, lastCol]);

  const trendValue = retentionTrend !== null ? parseFloat(retentionTrend) : null;
  const accentColor = tipoCohort === 'Vacância' ? '#3b82f6' : '#22c55e';
  const accentColorSoft = tipoCohort === 'Vacância' ? '#60a5fa' : '#4ade80';

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><Grid3X3 size={24} /> Análise de Cohort</h1>
        <p className="subtitle">Evolução de {tipoCohort.toLowerCase()} por corte no tempo.</p>
      </header>

      <div className="filter-section glass-panel">
        <label className="select-label">Selecione o tipo de análise:</label>
        <div className="toggle-tabs">
          <button
            className={`tab-btn ${tipoCohort === 'Vacância' ? 'active vacancia' : ''}`}
            onClick={() => setTipoCohort('Vacância')}
          >
            Vacância
          </button>
          <button
            className={`tab-btn ${tipoCohort === 'Vigência' ? 'active vigencia' : ''}`}
            onClick={() => setTipoCohort('Vigência')}
          >
            Vigência
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Carregando matriz de cohort...</p></div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>


          <div className="cohort-content glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '4px' }}>Evolução da {tipoCohort}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Taxa de {tipoCohort.toLowerCase()} por cohort trimestral ao longo dos meses
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px 10px' }}>
                Atualizado: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="heatmap-container">
              <div className="heatmap-scroll">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th className="cohort-label-header">Cohort (Trimestre)</th>
                      {monthColumns.map(col => (
                        <th key={col} className="month-header">Mês {col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="cohort-label-cell">{row.cohort_label}</td>
                        {monthColumns.map((col, colIndex) => {
                          const rawValue = row[col];
                          const pct = toPercent(rawValue);
                          const colorStyle = getColorStyle(pct, tipoCohort);
                          const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
                          const animDelay = `${0.05 + rowIndex * 0.04 + colIndex * 0.01}s`;

                          return (
                            <td
                              key={col}
                              className="heatmap-cell"
                              title={`${row.cohort_label} — Mês ${col}: ${formatPercentage(rawValue)}`}
                              onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                              onMouseLeave={() => setHoveredCell(null)}
                              style={{ padding: '4px 3px' }}
                            >
                              <div
                                style={{
                                  ...colorStyle,
                                  padding: '6px 4px',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                                  transition: 'transform 0.15s, box-shadow 0.15s',
                                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                  boxShadow: isHovered
                                    ? `0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px ${accentColor}`
                                    : 'none',
                                  animation: `cohortFadeIn ${animDelay} ease both`,
                                  minWidth: '52px',
                                  display: 'block',
                                  textAlign: 'center',
                                }}
                              >
                                {formatPercentage(rawValue)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Escala de intensidade:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[
                  { label: 'Baixo', pct: 15 },
                  { label: 'Médio', pct: 50 },
                  { label: 'Alto', pct: 85 },
                ].map(({ label, pct }) => {
                  const s = getColorStyle(pct, tipoCohort);
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: s.background }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes cohortFadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
