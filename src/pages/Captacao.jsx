import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { Target } from 'lucide-react';
import './Captacao.css';

export const Captacao = () => {
  const { api } = useAuth();
  const [dataCap, setDataCap] = useState([]);
  const [dataLoc, setDataLoc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroPeriodo, setFiltroPeriodo] = useState('Este mês');
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resCap, resLoc] = await Promise.all([
          api.get('/captacoes'),
          api.get('/captacoes_locacoes')
        ]);
        
        setDataCap(resCap.data.map(item => ({
          ...item,
          dataObj: item.data ? new Date(item.data) : null
        })).filter(item => item.dataObj !== null && item.id));

        setDataLoc(resLoc.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          dataObj: item.data_aluguel ? new Date(item.data_aluguel) : null
        })).filter(item => item.dataObj !== null && item.id && item.aluguelNum > 0));

      } catch (err) {
        setError('Falha ao carregar dados de captações.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  const obterPeriodoFiltragem = () => {
    const hoje = new Date();
    let inicio, fim = hoje;
    if (filtroPeriodo === 'Este mês') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (filtroPeriodo === 'Este Trimestre') {
      const mesInicio = Math.floor(hoje.getMonth() / 3) * 3;
      inicio = new Date(hoje.getFullYear(), mesInicio, 1);
    } else if (filtroPeriodo === 'Este ano') {
      inicio = new Date(hoje.getFullYear(), 0, 1);
    } else {
      inicio = new Date(dataInicial);
      fim = new Date(dataFinal);
    }
    return { inicio, fim };
  };

  const { inicio, fim } = obterPeriodoFiltragem();
  
  const dfCap = dataCap.filter(item => item.dataObj >= inicio && item.dataObj <= fim);
  const dfLoc = dataLoc.filter(item => item.dataObj >= inicio && item.dataObj <= fim);

  // KPIs
  const capQtd = new Set(dfCap.map(i => i.id)).size;
  const locQtd = new Set(dfLoc.map(i => i.id)).size;
  const vglTotal = dfLoc.reduce((acc, curr) => acc + curr.aluguelNum, 0);
  const ticketMedio = locQtd > 0 ? vglTotal / locQtd : 0;

  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Data Processing for Charts
  const captadores = [...new Set([...dfCap.map(c => c.captador), ...dfLoc.map(l => l.captador)])].filter(Boolean);
  const tipologias = ['Residencial', 'Comercial'];

  // Bar Charts Processing
  const barDataCap = captadores.map(cap => {
    const res = { captador: cap, total: 0 };
    tipologias.forEach(tipo => {
      const count = new Set(dfCap.filter(c => c.captador === cap && c.tipologia === tipo).map(c => c.id)).size;
      res[tipo] = count;
      res.total += count;
    });
    return res;
  }).sort((a, b) => a.total - b.total); // Sort ascending for horizontal bar

  const barDataLoc = captadores.map(cap => {
    const res = { captador: cap, total: 0, totalVgl: 0 };
    tipologias.forEach(tipo => {
      const subset = dfLoc.filter(c => c.captador === cap && c.tipologia === tipo);
      const count = new Set(subset.map(c => c.id)).size;
      const vgl = subset.reduce((acc, curr) => acc + curr.aluguelNum, 0);
      res[`${tipo}_loc`] = count;
      res[`${tipo}_vgl`] = vgl;
      res.total += count;
      res.totalVgl += vgl;
    });
    res.ticketMedio = res.total > 0 ? res.totalVgl / res.total : 0;
    return res;
  });

  const barDataLocCount = [...barDataLoc].sort((a, b) => a.total - b.total);
  const barDataLocVgl = [...barDataLoc].sort((a, b) => a.totalVgl - b.totalVgl);
  const barDataLocTicket = [...barDataLoc].sort((a, b) => a.ticketMedio - b.ticketMedio);

  // Line Charts Processing
  const getMesAno = (dateObj) => dateObj.toISOString().slice(0, 7); // YYYY-MM
  
  const processLineData = (df, valueFn) => {
    const series = {};
    const todosMeses = new Set();
    
    df.forEach(item => {
      if(!item.captador) return;
      const m = getMesAno(item.dataObj);
      todosMeses.add(m);
      if(!series[item.captador]) series[item.captador] = {};
      if(!series[item.captador][m]) series[item.captador][m] = new Set();
      series[item.captador][m].add(item.id);
    });

    const mesesArray = [...todosMeses].sort();
    
    return Object.entries(series).map(([cap, mesesMap]) => {
      return {
        id: cap,
        data: mesesArray.map(m => ({
          x: m,
          y: mesesMap[m] ? valueFn(mesesMap[m]) : 0
        }))
      };
    });
  };

  const lineDataCap = processLineData(dfCap, (set) => set.size);
  const lineDataLoc = processLineData(dfLoc, (set) => set.size);

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
        <h1><Target size={24} /> Captação</h1>
        <p className="subtitle">Análise de captações, locações e VGL por captador.</p>
      </header>

      <div className="filter-section glass-panel">
        <div className="filter-options">
          {['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].map(opcao => (
            <label key={opcao} className="radio-label">
              <input 
                type="radio" 
                name="filtroPeriodo" 
                value={opcao} 
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)} 
              />
              {opcao}
            </label>
          ))}
        </div>
        {filtroPeriodo === 'Personalizado' && (
          <div className="custom-date-filters">
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
            <span>até</span>
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Carregando dados de captação...</p></div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="metrics-row">
            <div className="metric-card glass-panel">
              <span className="metric-label">Captações</span>
              <span className="metric-value">{formatMilhar(capQtd)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Locações</span>
              <span className="metric-value">{formatMilhar(locQtd)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">VGL</span>
              <span className="metric-value highlight">{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value">{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Captações por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataCap}
                  keys={['Residencial', 'Comercial']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 40, left: 100 }}
                  padding={0.3}
                  colors={['#0D47A1', '#90CAF9']}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id}: {formatMilhar(value)} captações</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Locações por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocCount}
                  keys={['Residencial_loc', 'Comercial_loc']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 40, left: 100 }}
                  padding={0.3}
                  colors={['#D81B60', '#F8BBD0']}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_loc', '')}: {formatMilhar(value)} locações</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>VGL por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocVgl}
                  keys={['Residencial_vgl', 'Comercial_vgl']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 40, left: 100 }}
                  padding={0.3}
                  colors={['#1B5E20', '#A5D6A7']}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  valueFormat={v => `R$ ${(v/1000).toFixed(1)}k`}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_vgl', '')}: {formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Ticket Médio por Captador</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocTicket}
                  keys={['ticketMedio']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 40, left: 100 }}
                  padding={0.3}
                  colors={['#FFD700']}
                  labelTextColor="#000"
                  theme={commonTheme}
                  valueFormat={v => formatMoeda(v)}
                  tooltip={({ value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Evolução de Captações</h3>
              <div className="line-chart-container">
                <ResponsiveLine
                  data={lineDataCap}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  axisBottom={{ tickRotation: -45 }}
                  colors={{ scheme: 'category10' }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  useMesh={true}
                  theme={commonTheme}
                  tooltip={({ point }) => (
                    <div className="chart-tooltip">
                      <strong>{point.data.xFormatted}</strong><br/>
                      {point.serieId}: {point.data.yFormatted}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Evolução de Locações</h3>
              <div className="line-chart-container">
                <ResponsiveLine
                  data={lineDataLoc}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  axisBottom={{ tickRotation: -45 }}
                  colors={{ scheme: 'set2' }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  useMesh={true}
                  theme={commonTheme}
                  tooltip={({ point }) => (
                    <div className="chart-tooltip">
                      <strong>{point.data.xFormatted}</strong><br/>
                      {point.serieId}: {point.data.yFormatted}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
