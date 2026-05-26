import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveBar } from '@nivo/bar';
import { AreaChart } from '../components/ui/AreaChart';
import { Magnet } from 'lucide-react';
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

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr) ? null : dateStr;
    const str = String(dateStr);
    
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
      return isNaN(d) ? null : d;
    }
    
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
      return isNaN(d) ? null : d;
    }
    
    const d = new Date(str + 'T12:00:00'); // Força meio-dia para evitar shift de timezone
    return isNaN(d) ? null : d;
  };

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
          dataObj: parseDate(item.data)
        })).filter(item => item.dataObj !== null && item.id));

        setDataLoc(resLoc.data.map(item => ({
          ...item,
          aluguelNum: parseFloat(item.aluguel) || 0,
          dataObj: parseDate(item.data_aluguel)
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
      inicio = new Date(dataInicial + 'T00:00:00');
      fim = new Date(dataFinal + 'T23:59:59');
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
  const tipologias = ['Residencial', 'Comercial', 'Misto'];

  const basePalette = [
    { res: '#3b82f6', com: '#1e3a8a', misto: '#fca5a5' }, // Blue
    { res: '#a855f7', com: '#581c87', misto: '#fca5a5' }, // Purple
    { res: '#10b981', com: '#064e3b', misto: '#fca5a5' }, // Emerald
    { res: '#f43f5e', com: '#881337', misto: '#fca5a5' }, // Rose
    { res: '#f59e0b', com: '#78350f', misto: '#fca5a5' }, // Amber
    { res: '#06b6d4', com: '#164e63', misto: '#fca5a5' }, // Cyan
    { res: '#ec4899', com: '#831843', misto: '#fca5a5' }, // Pink
    { res: '#8b5cf6', com: '#4c1d95', misto: '#fca5a5' }, // Violet
    { res: '#84cc16', com: '#3f6212', misto: '#fca5a5' }, // Lime
  ];

  const captadorColors = {};
  captadores.forEach((cap, idx) => {
    captadorColors[cap] = basePalette[idx % basePalette.length];
  });

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

  const transformDataForSubframe = (lineData) => {
    if (!lineData || lineData.length === 0) {
      return { data: [], categories: [] };
    }
    const flatDataMap = {};
    const categories = [];
    
    lineData.forEach(series => {
      const capName = series.id;
      categories.push(capName);
      
      series.data.forEach(pt => {
        const mes = pt.x;
        const val = pt.y;
        if (!flatDataMap[mes]) {
          flatDataMap[mes] = { mes };
        }
        flatDataMap[mes][capName] = val;
      });
    });
    
    const sortedData = Object.values(flatDataMap).sort((a, b) => a.mes.localeCompare(b.mes));
    return { data: sortedData, categories };
  };

  const subframeCap = transformDataForSubframe(lineDataCap);
  const subframeLoc = transformDataForSubframe(lineDataLoc);

  // Dynamic left margin based on longest captador name
  const longestName = captadores.reduce((max, cap) => cap.length > max.length ? cap : max, '');
  const marginLeft = Math.max(100, Math.min(200, longestName.length * 8 + 16));

  // Line chart colors synced with captador palette
  const lineColorsCap = subframeCap.categories.map(cap => captadorColors[cap]?.res || '#60a5fa');
  const lineColorsLoc = subframeLoc.categories.map(cap => captadorColors[cap]?.res || '#a855f7');

  const commonTheme = {
    axis: {
      ticks: { text: { fill: 'var(--text-secondary)', fontSize: 16, fontWeight: 600 } },
      legend: { text: { fill: 'var(--text-primary)', fontSize: 18, fontWeight: 700 } }
    },
    labels: { text: { fontSize: 16, fontWeight: 'bold' } },
    grid: { line: { stroke: 'var(--border-color)', strokeWidth: 1 } },
    tooltip: { container: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' } }
  };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><Magnet size={24} /> Captação</h1>
        <p className="subtitle">Análise de captações, locações e VGL por captador.</p>
      </header>

      <div className="filter-section glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
        <div className="glass-radio-group" style={{
          '--accent-color': 'linear-gradient(135deg, rgba(0, 240, 255, 0.4), rgba(0, 240, 255, 0.8))',
          '--accent-glow': 'rgba(0, 240, 255, 0.5)',
          borderRadius: '16px'
        }}>
          {['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].map((opcao, idx) => (
            <React.Fragment key={opcao}>
              <input 
                type="radio" 
                name="filtroPeriodo" 
                id={`periodo-captacao-${idx}`}
                value={opcao} 
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)} 
              />
              <label htmlFor={`periodo-captacao-${idx}`}>{opcao}</label>
            </React.Fragment>
          ))}
          <div className="glass-glider" style={{
            borderRadius: '12px',
            transform: `translateX(${['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'].indexOf(filtroPeriodo) * 100}%)`
          }} />
        </div>
        {filtroPeriodo === 'Personalizado' && (
          <div className="custom-date-filters">
            <input 
              type="date" 
              value={dataInicial} 
              onChange={e => setDataInicial(e.target.value)} 
              style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
            <span>até</span>
            <input 
              type="date" 
              value={dataFinal} 
              onChange={e => setDataFinal(e.target.value)} 
              style={{ borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
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
            <div className="metric-card glass-panel" style={{ borderRadius: '16px' }}>
              <span className="metric-label">Captações</span>
              <span className="metric-value" style={{ color: '#60a5fa', textShadow: '0 0 10px rgba(96, 165, 250, 0.4)' }}>{formatMilhar(capQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ borderRadius: '16px' }}>
              <span className="metric-label">Locações</span>
              <span className="metric-value" style={{ color: '#38bdf8', textShadow: '0 0 10px rgba(56, 189, 248, 0.4)' }}>{formatMilhar(locQtd)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ 
              border: '1px solid rgba(0, 240, 255, 0.4)', 
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.1)', 
              background: 'linear-gradient(135deg, rgba(0, 20, 30, 0.6) 0%, rgba(0, 5, 10, 0.8) 100%)',
              borderRadius: '16px'
            }}>
              <span className="metric-label" style={{ color: '#bae6fd' }}>VGL</span>
              <span className="metric-value" style={{ 
                color: '#00f0ff', 
                textShadow: '0 0 15px rgba(0, 240, 255, 0.9), 0 0 30px rgba(0, 240, 255, 0.5)', 
                background: 'linear-gradient(to right, #00f0ff, #bae6fd)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent', 
                display: 'inline-block', 
                fontWeight: '800' 
              }}>{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel" style={{ borderRadius: '16px' }}>
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value" style={{ color: '#7dd3fc', textShadow: '0 0 10px rgba(125, 211, 252, 0.3)' }}>{formatMoeda(ticketMedio)}</span>
            </div>
          </div>

          {/* Legenda global por captador */}
          {captadores.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Captadores:</span>
              {captadores.map(cap => (
                <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: captadorColors[cap]?.res || '#60a5fa' }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: captadorColors[cap]?.com || '#1e3a8a' }} />
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: captadorColors[cap]?.misto || '#fca5a5' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#f0f0f0', fontWeight: 500 }}>{cap}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#aaa' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#555' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ccc' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Res / Com / Mis</span>
              </div>
            </div>
          )}

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>Captações por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataCap}
                  keys={['Residencial', 'Comercial', 'Misto']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 10, left: marginLeft }}
                  padding={0.3}
                  borderRadius={4}
                  colors={({ id, data }) => id.includes('Residencial') ? captadorColors[data.captador].res : id.includes('Comercial') ? captadorColors[data.captador].com : captadorColors[data.captador].misto}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  labelSkipWidth={45}
                  axisBottom={null}
                  label={d => `${d.id.includes('Residencial') ? 'Res' : d.id.includes('Comercial') ? 'Com' : 'Mis'}: ${formatMilhar(d.value)}`}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id}: {formatMilhar(value)} captações</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>Locações por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocCount}
                  keys={['Residencial_loc', 'Comercial_loc', 'Misto_loc']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 10, left: marginLeft }}
                  padding={0.3}
                  borderRadius={4}
                  colors={({ id, data }) => id.includes('Residencial') ? captadorColors[data.captador].res : id.includes('Comercial') ? captadorColors[data.captador].com : captadorColors[data.captador].misto}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  labelSkipWidth={45}
                  axisBottom={null}
                  label={d => `${d.id.includes('Residencial') ? 'Res' : d.id.includes('Comercial') ? 'Com' : 'Mis'}: ${formatMilhar(d.value)}`}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_loc', '')}: {formatMilhar(value)} locações</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>VGL por Captador e Tipologia</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocVgl}
                  keys={['Residencial_vgl', 'Comercial_vgl', 'Misto_vgl']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 10, left: marginLeft }}
                  padding={0.3}
                  borderRadius={4}
                  colors={({ id, data }) => id.includes('Residencial') ? captadorColors[data.captador].res : id.includes('Comercial') ? captadorColors[data.captador].com : captadorColors[data.captador].misto}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  labelSkipWidth={65}
                  axisBottom={null}
                  label={d => `${d.id.includes('Residencial') ? 'Res' : d.id.includes('Comercial') ? 'Com' : 'Mis'}: R$ ${(d.value/1000).toFixed(1)}k`}
                  valueFormat={v => `R$ ${(v/1000).toFixed(1)}k`}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_vgl', '')}: {formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>Ticket Médio por Captador</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocTicket}
                  keys={['ticketMedio']}
                  indexBy="captador"
                  layout="horizontal"
                  margin={{ top: 10, right: 20, bottom: 10, left: marginLeft }}
                  padding={0.3}
                  borderRadius={4}
                  colors={({ data }) => captadorColors[data.captador].res}
                  labelTextColor="#ffffff"
                  theme={commonTheme}
                  labelSkipWidth={65}
                  axisBottom={null}
                  valueFormat={v => formatMoeda(v)}
                  tooltip={({ value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>Evolução de Captações</h3>
              <div className="line-chart-container" style={{ height: "380px", width: "100%" }}>
                {subframeCap.data.length > 0 ? (
                  <AreaChart
                    data={subframeCap.data}
                    index="mes"
                    categories={subframeCap.categories}
                    colors={lineColorsCap}
                  />
                ) : (
                  <div className="no-data-message" style={{ color: "#94a3b8", textAlign: "center", paddingTop: "50px" }}>
                    Nenhuma captação registrada no período.
                  </div>
                )}
              </div>
            </div>

            <div className="chart-wrapper glass-panel" style={{ borderRadius: '20px' }}>
              <h3>Evolução de Locações</h3>
              <div className="line-chart-container" style={{ height: "380px", width: "100%" }}>
                {subframeLoc.data.length > 0 ? (
                  <AreaChart
                    data={subframeLoc.data}
                    index="mes"
                    categories={subframeLoc.categories}
                    colors={lineColorsLoc}
                  />
                ) : (
                  <div className="no-data-message" style={{ color: "#94a3b8", textAlign: "center", paddingTop: "50px" }}>
                    Nenhuma locação registrada no período.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
