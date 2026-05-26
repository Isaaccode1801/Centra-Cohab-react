import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const defaultData = [
  { cohort: 'Jan 2024', week0: 100, week1: 85, week2: 72, week3: 65, week4: 58, week5: 52, week6: 48, week7: 45 },
  { cohort: 'Fev 2024', week0: 100, week1: 88, week2: 76, week3: 68, week4: 62, week5: 56, week6: 51, week7: 47 },
  { cohort: 'Mar 2024', week0: 100, week1: 90, week2: 80, week3: 72, week4: 66, week5: 60, week6: 55, week7: 50 },
  { cohort: 'Abr 2024', week0: 100, week1: 92, week2: 84, week3: 76, week4: 70, week5: 64, week6: 59, week7: 54 },
  { cohort: 'Mai 2024', week0: 100, week1: 94, week2: 87, week3: 80, week4: 74, week5: 68, week6: 63, week7: 58 },
  { cohort: 'Jun 2024', week0: 100, week1: 95, week2: 89, week3: 83, week4: 77, week5: 72, week6: 67, week7: 62 },
  { cohort: 'Jul 2024', week0: 100, week1: 96, week2: 91, week3: 85, week4: 80, week5: 75, week6: 70, week7: 66 },
];

const getColorStyle = (value) => {
  if (value >= 90) return { background: '#10b981', color: '#fff' };
  if (value >= 80) return { background: '#34d399', color: '#fff' };
  if (value >= 70) return { background: '#6ee7b7', color: '#065f46' };
  if (value >= 60) return { background: '#fbbf24', color: '#1c1917' };
  if (value >= 50) return { background: '#f97316', color: '#fff' };
  if (value >= 40) return { background: '#f87171', color: '#fff' };
  return { background: '#ef4444', color: '#fff' };
};

const weekKeys = ['week0', 'week1', 'week2', 'week3', 'week4', 'week5', 'week6', 'week7'];
const weeks = ['Sem. 0', 'Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4', 'Sem. 5', 'Sem. 6', 'Sem. 7'];

export function CohortAnalysis({ data = defaultData, title = 'Análise de Cohort', description = 'Taxa de retenção por cohort ao longo do tempo' }) {
  const [selectedMetric, setSelectedMetric] = useState('retention');
  const [hoveredCell, setHoveredCell] = useState(null);

  const averageRetention = useMemo(() => {
    const vals = data.map(d => d.week7);
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }, [data]);

  const retentionTrend = useMemo(() => {
    if (data.length < 2) return '0';
    const latest = data[data.length - 1].week7;
    const previous = data[data.length - 2].week7;
    return ((latest - previous) / previous * 100).toFixed(1);
  }, [data]);

  const trendValue = parseFloat(retentionTrend);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ marginBottom: '4px' }}>{title}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{description}</p>
          </div>
          <select
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="retention">Taxa de Retenção</option>
            <option value="churn">Taxa de Churn</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  Cohort
                </th>
                {weeks.map((w, i) => (
                  <th key={i} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    {row.cohort}
                  </td>
                  {weekKeys.map((key, colIndex) => {
                    const rawValue = row[key];
                    const displayValue = selectedMetric === 'churn'
                      ? (100 - rawValue).toFixed(0)
                      : rawValue.toFixed(0);
                    const colorValue = selectedMetric === 'churn' ? 100 - rawValue : rawValue;
                    const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;

                    return (
                      <td
                        key={colIndex}
                        style={{ padding: '6px 4px', textAlign: 'center' }}
                        onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          style={{
                            ...getColorStyle(colorValue),
                            padding: '6px 10px',
                            borderRadius: '7px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            display: 'inline-block',
                            minWidth: '48px',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                            boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px rgba(0,240,255,0.5)' : 'none',
                            animation: `cohortFadeIn ${0.1 + rowIndex * 0.04 + colIndex * 0.015}s ease both`,
                          }}
                        >
                          {displayValue}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Escala:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {[
                { color: '#ef4444', label: 'Baixo' },
                { color: '#fbbf24', label: 'Médio' },
                { color: '#10b981', label: 'Alto' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: color }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px 10px' }}>
            Atualizado: {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes cohortFadeIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
