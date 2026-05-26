import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { Handshake } from 'lucide-react';

export const ContratosRenovacao = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroPeriodo, setFiltroPeriodo] = useState('Este mês');
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split('T')[0]);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr) ? null : dateStr;
    const str = String(dateStr);
    
    // DD/MM/YYYY — create local date
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
      return isNaN(d) ? null : d;
    }
    
    // YYYY-MM-DD (e.g. "2026-05-01") — create local date
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
      const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
      return isNaN(d) ? null : d;
    }
    
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/renovacoes');
        
        const validData = response.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          dataObj: parseDate(item.data),
          tipologia: item.tipologia || 'Não Informado'
        })).filter(item => item.dataObj !== null && item.aluguelNum > 0);
        
        setData(validData);
      } catch (err) {
        setError('Falha ao carregar dados de renovações.');
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
  const df = data.filter(item => item.dataObj >= inicio && item.dataObj <= fim);

  // KPIs
  const renovacoesQtd = df.length;
  const vglTotal = df.reduce((acc, curr) => acc + curr.aluguelNum, 0);
  const ticketMedio = renovacoesQtd > 0 ? vglTotal / renovacoesQtd : 0;

  // Formatters
  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Pie Chart Data (Tipologia)
  const tipologiaResumo = df.reduce((acc, curr) => {
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

  // Line Chart Data (Mensal)
  const mensalResumo = df.reduce((acc, curr) => {
    const mesAno = curr.dataObj.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[mesAno]) acc[mesAno] = { mesAno, renovacoes: 0, vgl: 0 };
    acc[mesAno].renovacoes += 1;
    acc[mesAno].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const mensalArray = Object.values(mensalResumo).sort((a, b) => a.mesAno.localeCompare(b.mesAno));
  
  const lineVglData = [
    {
      id: "VGL Renovado",
      color: "#2ecc71",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.vgl }))
    }
  ];

  const lineRenovacoesData = [
    {
      id: "Renovações",
      color: "#27ae60",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.renovacoes }))
    }
  ];
  
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
        <h1><Handshake size={24} /> Contratos Renovação</h1>
        <p className="subtitle">Acompanhamento do VGL mantido e quantidade de contratos renovados.</p>
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
        <div className="loading-state"><div className="spinner"></div><p>Carregando dados...</p></div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="metrics-row">
            <div className="metric-card glass-panel">
              <span className="metric-label">Renovações</span>
              <span className="metric-value">{formatMilhar(renovacoesQtd)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">VGL Renovado</span>
              <span className="metric-value success-text" style={{ color: '#4ade80' }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value">{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Quantidade por Tipologia</h3>
              <div className="pie-container">
                <ResponsivePie
                  data={pieDataQtd}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={4}
                  colors={['#27ae60', '#2ecc71', '#f1c40f']}
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
              <h3>VGL Renovado por Tipologia</h3>
              <div className="pie-container">
                <ResponsivePie
                  data={pieDataVgl}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={4}
                  colors={['#2ecc71', '#f1c40f', '#f39c12']}
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

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Evolução de Renovações</h3>
              <div className="line-chart-container">
                <ResponsiveLine
                  data={lineRenovacoesData}
                  margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  axisBottom={{ tickRotation: -45 }}
                  colors={{ datum: 'color' }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  enableArea={true}
                  areaOpacity={0.15}
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
              <h3>Evolução do VGL Renovado</h3>
              <div className="line-chart-container">
                <ResponsiveLine
                  data={lineVglData}
                  margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                  axisBottom={{ tickRotation: -45 }}
                  axisLeft={{ format: v => `R$ ${(v/1000).toFixed(0)}k` }}
                  colors={{ datum: 'color' }}
                  pointSize={8}
                  pointColor={{ theme: 'background' }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  enableArea={true}
                  areaOpacity={0.15}
                  useMesh={true}
                  theme={commonTheme}
                  tooltip={({ point }) => (
                    <div className="chart-tooltip">
                      <strong>{point.data.xFormatted}</strong><br/>
                      {point.serieId}: {formatMoeda(point.data.yFormatted)}
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
