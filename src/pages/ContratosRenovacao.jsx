import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { Handshake } from 'lucide-react';
import { ParentSize } from '@visx/responsive';
import { DoubleDonutChart } from '../components/DoubleDonutChart';
import { AreaChart } from '../components/ui/AreaChart';

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
      inicio = new Date(dataInicial + 'T00:00:00');
      fim = new Date(dataFinal + 'T23:59:59');
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

  const subframeRenovacoes = mensalArray.length > 0 ? {
    data: mensalArray.map(m => ({ mes: m.mesAno, 'Renovações': m.renovacoes })),
    categories: ['Renovações']
  } : { data: [], categories: [] };

  const subframeVgl = mensalArray.length > 0 ? {
    data: mensalArray.map(m => ({ mes: m.mesAno, 'VGL Renovado': m.vgl })),
    categories: ['VGL Renovado']
  } : { data: [], categories: [] };
  
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
        <div className="glass-radio-group" style={{
          '--accent-color': 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0.8))',
          '--accent-glow': 'rgba(34, 197, 94, 0.5)'
        }}>
          {['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].map((opcao, idx) => (
            <React.Fragment key={opcao}>
              <input 
                type="radio" 
                name="filtroPeriodo" 
                id={`periodo-renovacao-${idx}`}
                value={opcao} 
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)} 
              />
              <label htmlFor={`periodo-renovacao-${idx}`}>{opcao}</label>
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
              <span className="metric-label">Renovações</span>
              <span className="metric-value" style={{ color: '#4ade80', textShadow: '0 0 10px rgba(74, 222, 128, 0.4)' }}>{formatMilhar(renovacoesQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ border: '1px solid rgba(34, 197, 94, 0.4)', boxShadow: '0 0 20px rgba(34, 197, 94, 0.15), inset 0 0 15px rgba(34, 197, 94, 0.1)', background: 'linear-gradient(135deg, rgba(0, 20, 0, 0.6) 0%, rgba(0, 5, 0, 0.8) 100%)' }}>
              <span className="metric-label" style={{ color: '#a7f3d0' }}>VGL Renovado</span>
              <span className="metric-value" style={{ color: '#22c55e', textShadow: '0 0 15px rgba(34, 197, 94, 0.9), 0 0 30px rgba(34, 197, 94, 0.5)', background: 'linear-gradient(to right, #4ade80, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', fontWeight: '800' }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value" style={{ color: '#34d399', textShadow: '0 0 10px rgba(52, 211, 153, 0.3)' }}>{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          <div className="charts-grid-2" style={{ gridTemplateColumns: '1fr' }}>
            <div className="chart-wrapper glass-panel">
              <h3>Quantidade e VGL Renovado por Tipologia (Qtd externa, VGL interno)</h3>
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
                      outerColorRange={['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46']}
                      innerColorRange={['#022c22', '#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399']}
                    />
                  )}
                </ParentSize>
              </div>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel">
              <h3>Evolução de Renovações</h3>
              <div className="line-chart-container" style={{ height: '380px', width: '100%' }}>
                {subframeRenovacoes.data.length > 0 ? (
                  <AreaChart
                    data={subframeRenovacoes.data}
                    index="mes"
                    categories={subframeRenovacoes.categories}
                    colors={['#10b981', '#34d399']}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>Sem dados no período.</div>
                )}
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Evolução do VGL Renovado</h3>
              <div className="line-chart-container" style={{ height: '380px', width: '100%' }}>
                {subframeVgl.data.length > 0 ? (
                  <AreaChart
                    data={subframeVgl.data}
                    index="mes"
                    categories={subframeVgl.categories}
                    colors={['#059669', '#065f46']}
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
