import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { FileX } from 'lucide-react';
import { ParentSize } from '@visx/responsive';
import { DoubleDonutChart } from "../components/DoubleDonutChart";
import { BarChart, Bar, BarYAxis, Grid, ChartTooltip } from "../components/BarChart";
import { AreaChart } from '../components/ui/AreaChart';

const QtdLabels = ({ bars }) => {
  return bars.map(bar => {
    const val = bar.data.value;
    if (val === undefined || val === null || val === 0) return null;
    const labelText = String(val);
    const isSmall = bar.width < 30;
    const x = isSmall ? bar.x + bar.width + 6 : bar.x + bar.width / 2;
    const textAnchor = isSmall ? 'start' : 'middle';
    return (
      <text
        key={bar.key}
        x={x}
        y={bar.y + bar.height / 2}
        dy="0.35em"
        textAnchor={textAnchor}
        fill="#ffffff"
        fontSize="10px"
        fontWeight="700"
      >
        {labelText}
      </text>
    );
  });
};

const VglRescisaoLabels = ({ bars }) => {
  return bars.map(bar => {
    const val = bar.data.value;
    if (val === undefined || val === null || val === 0) return null;
    const labelText = `R$ ${(val / 1000).toFixed(1)}k`;
    const isSmall = bar.width < 65;
    const x = isSmall ? bar.x + bar.width + 6 : bar.x + bar.width / 2;
    const textAnchor = isSmall ? 'start' : 'middle';
    return (
      <text
        key={bar.key}
        x={x}
        y={bar.y + bar.height / 2}
        dy="0.35em"
        textAnchor={textAnchor}
        fill="#ffffff"
        fontSize="10px"
        fontWeight="700"
      >
        {labelText}
      </text>
    );
  });
};

export const ContratosRescisao = () => {
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
        const response = await api.get('/rescisoes');

        const validData = response.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          dataObj: parseDate(item.data),
          motivo: item.resposta || 'Não Informado'
        })).filter(item => item.dataObj !== null && item.aluguelNum > 0);

        setData(validData);
      } catch (err) {
        setError('Falha ao carregar dados de rescisões.');
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
  const rescisoesQtd = df.length;
  const vglTotal = df.reduce((acc, curr) => acc + curr.aluguelNum, 0);
  const ticketMedio = rescisoesQtd > 0 ? vglTotal / rescisoesQtd : 0;

  // Formatters
  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Pie Chart Data (Tipologia)
  const tipologiaResumo = df.reduce((acc, curr) => {
    const tipo = curr.tipologia || 'Desconhecido';
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

  // Bar Chart Data (Motivos)
  const motivosResumo = df.reduce((acc, curr) => {
    const motivo = curr.motivo;
    if (!acc[motivo]) acc[motivo] = { id: motivo, qtd: 0, vgl: 0 };
    acc[motivo].qtd += 1;
    acc[motivo].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const barDataMotivosQtd = Object.values(motivosResumo).sort((a, b) => a.qtd - b.qtd).slice(-10); // Top 10
  const barDataMotivosVgl = Object.values(motivosResumo).sort((a, b) => a.vgl - b.vgl).slice(-10); // Top 10

  // Line Chart Data (Mensal)
  const mensalResumo = df.reduce((acc, curr) => {
    const mesAno = curr.dataObj.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[mesAno]) acc[mesAno] = { mesAno, rescisoes: 0, vgl: 0 };
    acc[mesAno].rescisoes += 1;
    acc[mesAno].vgl += curr.aluguelNum;
    return acc;
  }, {});

  const mensalArray = Object.values(mensalResumo).sort((a, b) => a.mesAno.localeCompare(b.mesAno));

  const lineVglData = [
    {
      id: "VGL Rescindido",
      color: "#e74c3c",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.vgl }))
    }
  ];

  const lineRescisoesData = [
    {
      id: "Rescisões",
      color: "#c0392b",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.rescisoes }))
    }
  ];

  const subframeRescisoes = mensalArray.length > 0 ? {
    data: mensalArray.map(m => ({ mes: m.mesAno, 'Rescisões': m.rescisoes })),
    categories: ['Rescisões']
  } : { data: [], categories: [] };

  const subframeVglRescisao = mensalArray.length > 0 ? {
    data: mensalArray.map(m => ({ mes: m.mesAno, 'VGL Rescindido': m.vgl })),
    categories: ['VGL Rescindido']
  } : { data: [], categories: [] };

  const commonTheme = {
    axis: {
      ticks: { text: { fill: '#ffffff', fontSize: 11, fontWeight: 600 } },
      legend: { text: { fill: '#ffffff', fontSize: 13, fontWeight: 600 } }
    },
    grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
    tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '8px' } }
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><FileX size={24} /> Contratos Rescisão</h1>
        <p className="subtitle">Análise das perdas de contratos e motivos associados.</p>
      </header>

      <div className="filter-section glass-panel">
        <div className="glass-radio-group" style={{
          '--accent-color': 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.8))',
          '--accent-glow': 'rgba(239, 68, 68, 0.5)'
        }}>
          {['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].map((opcao, idx) => (
            <React.Fragment key={opcao}>
              <input
                type="radio"
                name="filtroPeriodo"
                id={`periodo-rescisao-${idx}`}
                value={opcao}
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              />
              <label htmlFor={`periodo-rescisao-${idx}`}>{opcao}</label>
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
              <span className="metric-label">Rescisões</span>
              <span className="metric-value" style={{ color: '#ff4d4d', textShadow: '0 0 10px rgba(255, 77, 77, 0.4)' }}>{formatMilhar(rescisoesQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.15), inset 0 0 15px rgba(239, 68, 68, 0.1)', background: 'linear-gradient(135deg, rgba(30, 0, 0, 0.6) 0%, rgba(10, 0, 0, 0.8) 100%)' }}>
              <span className="metric-label" style={{ color: '#ff9999' }}>VGL Perdido</span>
              <span className="metric-value" style={{ color: '#ff3b30', textShadow: '0 0 15px rgba(255, 59, 48, 0.9), 0 0 30px rgba(255, 59, 48, 0.5)', background: 'linear-gradient(to right, #ff3333, #ff8080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: '800' }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value" style={{ color: '#ff6666', textShadow: '0 0 10px rgba(255, 102, 102, 0.3)' }}>{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2" style={{ gridTemplateColumns: '1fr' }}>
            <div className="chart-wrapper glass-panel">
              <h3>Quantidade e VGL Perdido por Tipologia (Qtd externa, VGL interno)</h3>
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
                      outerColorRange={['#ffa4a2', '#ff867f', '#ff5252', '#ff1744', '#d50000', '#c62828', '#b71c1c']}
                      innerColorRange={['#300000', '#5a0000', '#800000', '#a80000', '#d00000', '#f83030', '#ff7070']}
                    />
                  )}
                </ParentSize>
              </div>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Top 10 Motivos (Qtd)</h3>
              <div className="bar-horizontal-container">
                <BarChart
                  data={barDataMotivosQtd}
                  xDataKey="id"
                  orientation="horizontal"
                  margin={{ top: 10, right: 60, bottom: 20, left: 250 }}
                  barGap={0.35}
                >
                  <Grid vertical={false} horizontal={false} />
                  <BarYAxis fontSize="14px" />
                  <Bar 
                    dataKey="qtd" 
                    fill="#c0392b" 
                    showValues={true}
                    valueFormatter={(v) => formatMilhar(v)}
                    valueFontSize="15px"
                  />
                  <ChartTooltip
                    rows={(point) => [
                      {
                        color: '#c0392b',
                        label: 'Rescisões',
                        value: formatMilhar(point.qtd)
                      }
                    ]}
                  />
                </BarChart>
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Top 10 Motivos (VGL)</h3>
              <div className="bar-horizontal-container">
                <BarChart
                  data={barDataMotivosVgl}
                  xDataKey="id"
                  orientation="horizontal"
                  margin={{ top: 10, right: 60, bottom: 20, left: 250 }}
                  barGap={0.35}
                >
                  <Grid vertical={false} horizontal={false} />
                  <BarYAxis fontSize="14px" />
                  <Bar 
                    dataKey="vgl" 
                    fill="#e74c3c" 
                    showValues={true}
                    valueFormatter={(v) => formatMoeda(v)}
                    valueFontSize="15px"
                  />
                  <ChartTooltip
                    rows={(point) => [
                      {
                        color: '#e74c3c',
                        label: 'VGL Perdido',
                        value: formatMoeda(point.vgl)
                      }
                    ]}
                  />
                </BarChart>
              </div>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Evolução de Rescisões</h3>
              <div className="line-chart-container" style={{ height: '380px', width: '100%' }}>
                {subframeRescisoes.data.length > 0 ? (
                  <AreaChart
                    data={subframeRescisoes.data}
                    index="mes"
                    categories={subframeRescisoes.categories}
                    colors={['#ef4444', '#f87171']}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>Sem dados no período.</div>
                )}
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Evolução do VGL Perdido</h3>
              <div className="line-chart-container" style={{ height: '380px', width: '100%' }}>
                {subframeVglRescisao.data.length > 0 ? (
                  <AreaChart
                    data={subframeVglRescisao.data}
                    index="mes"
                    categories={subframeVglRescisao.categories}
                    colors={['#dc2626', '#991b1b']}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>Sem dados no período.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
