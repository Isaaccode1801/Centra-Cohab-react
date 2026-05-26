import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Grid3X3 } from 'lucide-react';
import './Cohort.css';

export const Cohort = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipoCohort, setTipoCohort] = useState('Vacância');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint = tipoCohort === 'Vacância' ? '/cohort_vacancia' : '/cohort_vigencia';
        const response = await api.get(endpoint);
        
        // Transform the data to ensure we have a standard 'cohort_label'
        const transformedData = response.data.map(item => {
          // Find the key representing the Cohort label
          let cohortKey = Object.keys(item).find(key => key.includes('Cohort'));
          let cohortLabel = item[cohortKey] ? String(item[cohortKey]).replace('T', '') : 'Desconhecido';
          
          return {
            ...item,
            cohort_label: cohortLabel,
            cohort_key: cohortKey
          };
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

  // Extract month columns (usually they are numbers like '0', '1', '2'...)
  const getMonthColumns = () => {
    if (data.length === 0) return [];
    // Get all keys from the first object that are numbers
    const sample = data[0];
    return Object.keys(sample)
      .filter(key => !isNaN(Number(key)))
      .sort((a, b) => Number(a) - Number(b));
  };

  const monthColumns = getMonthColumns();

  // Helper to get CSS color for a cell based on its value
  const getCellColor = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'transparent';
    
    // value is assumed to be a decimal ratio (e.g. 0.95 for 95%)
    // But let's check if it's > 1
    const normalizedValue = value > 1 ? value / 100 : value;
    
    if (tipoCohort === 'Vacância') {
      // Blues
      return `hsla(210, 100%, 50%, ${normalizedValue})`;
    } else {
      // Greens
      return `hsla(120, 100%, 40%, ${normalizedValue})`;
    }
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    const percent = (value > 1 ? value : value * 100).toFixed(1);
    return `${percent.replace('.', ',')}%`;
  };

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
        <div className="cohort-content glass-panel">
          <h3>Evolução da {tipoCohort}</h3>
          
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
                  {data.map((row, idx) => (
                    <tr key={idx}>
                      <td className="cohort-label-cell">{row.cohort_label}</td>
                      {monthColumns.map(col => {
                        const cellValue = row[col];
                        return (
                          <td 
                            key={col} 
                            className="heatmap-cell"
                            style={{ backgroundColor: getCellColor(cellValue) }}
                            title={`${row.cohort_label} - Mês ${col}: ${formatPercentage(cellValue)}`}
                          >
                            <span className="cell-text">{formatPercentage(cellValue)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
