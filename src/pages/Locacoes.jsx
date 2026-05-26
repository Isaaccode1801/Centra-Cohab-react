import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { Map } from 'lucide-react';
import { ParentSize } from '@visx/responsive';
import { DoubleDonutChart } from '../components/DoubleDonutChart';
import { BarChart, Bar, BarYAxis, Grid, ChartTooltip } from "../components/BarChart";
import { AreaChart } from '../components/ui/AreaChart';
import './Locacoes.css';

export const Locacoes = () => {
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
        const response = await api.get('/locacoes');
        
        const validData = response.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          dataStr: item.data,
          dataObj: parseDate(item.data)
        })).filter(item => item.dataObj !== null && item.aluguelNum > 0 && item.CtrCod);
        
        setData(validData);
      } catch (err) {
        setError('Falha ao carregar dados de locações.');
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
      inicio = new Date(dataInicial + 'T00:00:00');
      fim = new Date(dataFinal + 'T23:59:59');
    }
    return { inicio, fim };
  };

  const { inicio, fim } = obterPeriodoFiltragem();
  const df = data.filter(item => item.dataObj >= inicio && item.dataObj <= fim);

  // KPIs
  const locacoesQtd = new Set(df.map(i => i.CtrCod)).size;
  const vglTotal = df.reduce((acc, curr) => acc + curr.aluguelNum, 0);
  const ticketMedio = locacoesQtd > 0 ? vglTotal / locacoesQtd : 0;

  // Formatters
  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Pie Chart Data (Tipologia)
  const tipologiaResumo = df.reduce((acc, curr) => {
    const tipo = curr.tipologia || 'Desconhecido';
    if (!acc[tipo]) acc[tipo] = { qtd: new Set(), vgl: 0 };
    acc[tipo].qtd.add(curr.CtrCod);
    acc[tipo].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const pieDataQtd = Object.entries(tipologiaResumo).map(([id, info]) => ({
    id, label: id, value: info.qtd.size
  }));
  
  const pieDataVgl = Object.entries(tipologiaResumo).map(([id, info]) => ({
    id, label: id, value: info.vgl
  }));

  // Bar Chart Data (Assistente)
  const assistenteResumo = df.reduce((acc, curr) => {
    const asst = curr.assistente || 'Desconhecido';
    const tipo = curr.tipologia || 'Desconhecido';
    if (!acc[asst]) acc[asst] = { id: asst, totalLocacoes: new Set(), totalVgl: 0, byTipo: {} };
    if (!acc[asst].byTipo[tipo]) acc[asst].byTipo[tipo] = { locacoes: new Set(), vgl: 0 };
    
    acc[asst].totalLocacoes.add(curr.CtrCod);
    acc[asst].totalVgl += curr.aluguelNum;
    acc[asst].byTipo[tipo].locacoes.add(curr.CtrCod);
    acc[asst].byTipo[tipo].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const assistenteArray = Object.values(assistenteResumo).map(asst => {
    let res = { 
      assistente: asst.id, 
      totalLocacoes: asst.totalLocacoes.size, 
      totalVgl: asst.totalVgl,
      ticketMedio: asst.totalLocacoes.size > 0 ? asst.totalVgl / asst.totalLocacoes.size : 0 
    };
    Object.entries(asst.byTipo).forEach(([tipo, info]) => {
      res[`${tipo}_locacoes`] = info.locacoes.size;
      res[`${tipo}_vgl`] = info.vgl;
    });
    return res;
  });

  const tipologias = [...new Set(df.map(i => i.tipologia || 'Desconhecido'))];
  const keysLocacoes = tipologias.map(t => `${t}_locacoes`);
  const keysVgl = tipologias.map(t => `${t}_vgl`);

  const barDataLocacoes = [...assistenteArray].sort((a, b) => a.totalLocacoes - b.totalLocacoes);
  const barDataVgl = [...assistenteArray].sort((a, b) => a.totalVgl - b.totalVgl);
  const barDataTicket = [...assistenteArray].sort((a, b) => a.ticketMedio - b.ticketMedio);

  // Line Chart Data (Mensal)
  const mensalResumo = df.reduce((acc, curr) => {
    const mesAno = curr.dataObj.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[mesAno]) acc[mesAno] = { mesAno, locacoes: new Set(), vgl: 0 };
    acc[mesAno].locacoes.add(curr.CtrCod);
    acc[mesAno].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const mensalArray = Object.values(mensalResumo).sort((a, b) => a.mesAno.localeCompare(b.mesAno));
  
  const lineVglData = [
    {
      id: "VGL Total",
      color: "#2ca02c",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.vgl }))
    }
  ];

  const subframeVgl = mensalArray.length > 0 ? {
    data: mensalArray.map(m => ({ mes: m.mesAno, 'VGL Total': m.vgl })),
    categories: ['VGL Total']
  } : { data: [], categories: [] };

  const lineLocacoesData = [
    {
      id: "Locações",
      color: "#6F2DBD",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.locacoes.size }))
    }
  ];
  
  const commonTheme = {
    axis: {
      ticks: { text: { fill: '#ffffff', fontSize: 15, fontWeight: 600 } },
      legend: { text: { fill: '#ffffff', fontSize: 17, fontWeight: 700 } }
    },
    grid: { line: { stroke: 'transparent' } },
    tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '8px' } }
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><Map size={24} /> Locações</h1>
        <p className="subtitle">Análise de locações por tipologia, assistente e evolução temporal.</p>
      </header>

      <div className="filter-section glass-panel">
        <div className="glass-radio-group" style={{
          '--accent-color': 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(168, 85, 247, 0.8))',
          '--accent-glow': 'rgba(168, 85, 247, 0.5)'
        }}>
          {['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].map((opcao, idx) => (
            <React.Fragment key={opcao}>
              <input 
                type="radio" 
                name="filtroPeriodo" 
                id={`periodo-locacoes-${idx}`}
                value={opcao} 
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)} 
              />
              <label htmlFor={`periodo-locacoes-${idx}`}>{opcao}</label>
            </React.Fragment>
          ))}
          <div className="glass-glider" style={{
            transform: `translateX(${['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].indexOf(filtroPeriodo) * 100}%)`
          }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="metrics-row">
            <div className="metric-card glass-panel">
              <span className="metric-label">Locações</span>
              <span className="metric-value" style={{ color: '#c084fc', textShadow: '0 0 10px rgba(192, 132, 252, 0.4)' }}>{formatMilhar(locacoesQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.15), inset 0 0 15px rgba(168, 85, 247, 0.1)', background: 'linear-gradient(135deg, rgba(20, 0, 30, 0.6) 0%, rgba(5, 0, 10, 0.8) 100%)' }}>
              <span className="metric-label" style={{ color: '#e9d5ff' }}>VGL</span>
              <span className="metric-value" style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.9), 0 0 30px rgba(168, 85, 247, 0.5)', background: 'linear-gradient(to right, #c084fc, #e9d5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: '800' }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value" style={{ color: '#d8b4fe', textShadow: '0 0 10px rgba(216, 180, 254, 0.3)' }}>{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2" style={{ gridTemplateColumns: '1fr' }}>
            <div className="chart-wrapper glass-panel">
              <h3>Quantidade e VGL por Tipologia (Qtd externa, VGL interno)</h3>
              <div className="pie-container">
                <ParentSize>
                  {({ width, height }) => (
                    <DoubleDonutChart
                      width={width}
                      height={height}
                      outerData={pieDataQtd}
                      innerData={pieDataVgl}
                      outerTitle="Qtd. Locações"
                      innerTitle="VGL (R$)"
                      formatOuterLabel={(v, isExpanded) => isExpanded ? formatMilhar(v) : formatMilhar(v)}
                      formatInnerLabel={(v, isExpanded) => {
                        const n = Number(v);
                        if (isExpanded) return formatMoeda(n);
                        if (n >= 1000000) return `${(n/1000000).toFixed(1).replace('.',',')} M`;
                        if (n >= 1000) return `${(n/1000).toFixed(1).replace('.',',')} K`;
                        return formatMilhar(n);
                      }}
                      outerColorRange={['#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8']}
                      innerColorRange={['#3b0764', '#581c87', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe']}
                    />
                  )}
                </ParentSize>
              </div>
            </div>
          </div>

          <div className="charts-grid-3">
            <div className="chart-wrapper glass-panel">
              <h3>Locações por Assistente</h3>
              <div className="bar-horizontal-container">
                <BarChart
                  data={barDataLocacoes}
                  xDataKey="assistente"
                  orientation="horizontal"
                  margin={{ top: 10, right: 30, bottom: 20, left: 110 }}
                  barGap={0.35}
                  stacked={true}
                  aspectRatio="auto"
                >
                  <Grid vertical={false} horizontal={false} />
                  <BarYAxis fontSize="14px" />
                  {tipologias.map((t, idx) => (
                    <Bar
                      key={t}
                      dataKey={`${t}_locacoes`}
                      fill={idx % 2 === 0 ? '#6F2DBD' : '#CDB4DB'}
                      showValues={true}
                      valueFormatter={(v) => String(v)}
                      valueFontSize="15px"
                    />
                  ))}
                  <ChartTooltip
                    rows={(point) => {
                      const rows = tipologias
                        .map((t, idx) => ({
                          color: idx % 2 === 0 ? '#6F2DBD' : '#CDB4DB',
                          label: t,
                          value: point[`${t}_locacoes`] ?? 0
                        }))
                        .filter(row => row.value > 0);
                      rows.push({
                        color: '#6F2DBD',
                        label: 'Total',
                        value: point.totalLocacoes ?? 0
                      });
                      return rows;
                    }}
                  />
                </BarChart>
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>VGL por Assistente</h3>
              <div className="bar-horizontal-container">
                <BarChart
                  data={barDataVgl}
                  xDataKey="assistente"
                  orientation="horizontal"
                  margin={{ top: 10, right: 30, bottom: 20, left: 110 }}
                  barGap={0.35}
                  stacked={true}
                  aspectRatio="auto"
                >
                  <Grid vertical={false} horizontal={false} />
                  <BarYAxis fontSize="14px" />
                  {tipologias.map((t, idx) => (
                    <Bar
                      key={t}
                      dataKey={`${t}_vgl`}
                      fill={idx % 2 === 0 ? '#1B5E20' : '#A5D6A7'}
                      showValues={true}
                      valueFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`}
                      valueFontSize="15px"
                    />
                  ))}
                  <ChartTooltip
                    rows={(point) => {
                      const rows = tipologias
                        .map((t, idx) => ({
                          color: idx % 2 === 0 ? '#1B5E20' : '#A5D6A7',
                          label: t,
                          value: formatMoeda(point[`${t}_vgl`] ?? 0)
                        }))
                        .filter(row => row.value !== 'R$ 0,00' && row.value !== 0);
                      rows.push({
                        color: '#1B5E20',
                        label: 'Total VGL',
                        value: formatMoeda(point.totalVgl ?? 0)
                      });
                      return rows;
                    }}
                  />
                </BarChart>
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Ticket Médio</h3>
              <div className="bar-horizontal-container">
                <BarChart
                  data={barDataTicket}
                  xDataKey="assistente"
                  orientation="horizontal"
                  margin={{ top: 10, right: 30, bottom: 20, left: 110 }}
                  barGap={0.35}
                  aspectRatio="auto"
                >
                  <Grid vertical={false} horizontal={false} />
                  <BarYAxis fontSize="14px" />
                  <Bar
                    dataKey="ticketMedio"
                    fill="#FFD700"
                    showValues={true}
                    valueFormatter={formatMoeda}
                    valueFontSize="14px"
                  />
                  <ChartTooltip
                    rows={(point) => [
                      {
                        color: '#FFD700',
                        label: 'Ticket Médio',
                        value: formatMoeda(point.ticketMedio ?? 0)
                      }
                    ]}
                  />
                </BarChart>
              </div>
            </div>
          </div>

          <div className="chart-wrapper glass-panel full-width">
            <h3>Evolução de Locações e VGL</h3>
            <div className="line-chart-container" style={{ height: '380px', width: '100%' }}>
              {subframeVgl.data.length > 0 ? (
                <AreaChart
                  data={subframeVgl.data}
                  index="mes"
                  categories={subframeVgl.categories}
                  colors={['#a855f7', '#7c3aed']}
                />
              ) : (
                <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>Sem dados no período.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
