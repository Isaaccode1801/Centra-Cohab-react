import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { MapPin } from 'lucide-react';
import './Locacoes.css';

const LocacoesLabels = ({ bars }) => {
  // Group by assistant to find the rightmost bar segment
  const grouped = {};
  bars.forEach(bar => {
    const name = bar.data.indexValue;
    if (!grouped[name] || (bar.x + bar.width > grouped[name].maxX)) {
      grouped[name] = {
        maxX: bar.x + bar.width,
        y: bar.y,
        height: bar.height,
        total: bar.data.data.totalLocacoes,
        key: bar.key
      };
    }
  });

  return Object.values(grouped).map(item => {
    const labelText = String(item.total);
    const x = item.maxX + 6;
    
    return (
      <text
        key={`label-${item.key}`}
        x={x}
        y={item.y + item.height / 2}
        dy="0.35em"
        textAnchor="start"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="700"
      >
        {labelText}
      </text>
    );
  });
};

const VglLabels = ({ bars }) => {
  // Group by assistant to find the rightmost bar segment
  const grouped = {};
  bars.forEach(bar => {
    const name = bar.data.indexValue;
    if (!grouped[name] || (bar.x + bar.width > grouped[name].maxX)) {
      grouped[name] = {
        maxX: bar.x + bar.width,
        y: bar.y,
        height: bar.height,
        total: bar.data.data.totalVgl,
        key: bar.key
      };
    }
  });

  return Object.values(grouped).map(item => {
    const labelText = `R$ ${(item.total / 1000).toFixed(1)}k`;
    const x = item.maxX + 6;
    
    return (
      <text
        key={`label-${item.key}`}
        x={x}
        y={item.y + item.height / 2}
        dy="0.35em"
        textAnchor="start"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="700"
      >
        {labelText}
      </text>
    );
  });
};

const TicketLabels = ({ bars }) => {
  return bars.map(bar => {
    const val = bar.data.value;
    if (val === undefined || val === null || val === 0) return null;
    const labelText = `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const isSmall = bar.width < 110;
    
    const x = isSmall ? bar.x + bar.width + 6 : bar.x + bar.width / 2;
    const textAnchor = isSmall ? "start" : "middle";
    const fill = isSmall ? "#ffffff" : "#000000";
    
    return (
      <text
        key={bar.key}
        x={x}
        y={bar.y + bar.height / 2}
        dy="0.35em"
        textAnchor={textAnchor}
        fill={fill}
        fontSize="10px"
        fontWeight="700"
      >
        {labelText}
      </text>
    );
  });
};

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
      inicio = new Date(dataInicial);
      fim = new Date(dataFinal);
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

  const lineLocacoesData = [
    {
      id: "Locações",
      color: "#6F2DBD",
      data: mensalArray.map(m => ({ x: m.mesAno, y: m.locacoes.size }))
    }
  ];
  
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
        <h1><MapPin size={24} /> Locações</h1>
        <p className="subtitle">Análise de locações por tipologia, assistente e evolução temporal.</p>
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
              <span className="metric-label">Locações</span>
              <span className="metric-value">{formatMilhar(locacoesQtd)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">VGL</span>
              <span className="metric-value">{formatMoeda(vglTotal)}</span>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-label">Ticket Médio</span>
              <span className="metric-value highlight">{formatMoeda(ticketMedio)}</span>
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
                  colors={['#6F2DBD', '#CDB4DB', '#1B5E20']}
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
              <h3>VGL por Tipologia</h3>
              <div className="pie-container">
                <ResponsivePie
                  data={pieDataVgl}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={4}
                  colors={['#1B5E20', '#A5D6A7', '#6F2DBD']}
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

          <div className="charts-grid-3">
            <div className="chart-wrapper glass-panel">
              <h3>Locações por Assistente</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataLocacoes}
                  keys={keysLocacoes}
                  indexBy="assistente"
                  layout="horizontal"
                  margin={{ top: 10, right: 80, bottom: 15, left: 140 }}
                  padding={0.3}
                  colors={['#6F2DBD', '#CDB4DB']}
                  enableLabel={false}
                  layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', LocacoesLabels]}
                  axisBottom={null}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8
                  }}
                  theme={commonTheme}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_locacoes', '')}: {formatMilhar(value)} locações</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>VGL por Assistente</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataVgl}
                  keys={keysVgl}
                  indexBy="assistente"
                  layout="horizontal"
                  margin={{ top: 10, right: 80, bottom: 15, left: 140 }}
                  padding={0.3}
                  colors={['#1B5E20', '#A5D6A7']}
                  enableLabel={false}
                  layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', VglLabels]}
                  axisBottom={null}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8
                  }}
                  theme={commonTheme}
                  tooltip={({ id, value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{id.replace('_vgl', '')}: {formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>

            <div className="chart-wrapper glass-panel">
              <h3>Ticket Médio</h3>
              <div className="bar-horizontal-container">
                <ResponsiveBar
                  data={barDataTicket}
                  keys={['ticketMedio']}
                  indexBy="assistente"
                  layout="horizontal"
                  margin={{ top: 10, right: 80, bottom: 15, left: 140 }}
                  padding={0.3}
                  colors={['#FFD700']}
                  enableLabel={false}
                  layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', TicketLabels]}
                  axisBottom={null}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8
                  }}
                  theme={commonTheme}
                  tooltip={({ value, indexValue }) => (
                    <div className="chart-tooltip"><strong>{indexValue}</strong><br/>{formatMoeda(value)}</div>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="chart-wrapper glass-panel full-width">
            <h3>Evolução de Locações e VGL</h3>
            <div className="line-chart-container">
              <ResponsiveLine
                data={lineVglData}
                margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
                axisBottom={{ tickRotation: -45 }}
                axisLeft={{ format: v => `R$ ${(v/1000).toFixed(0)}k` }}
                colors={{ datum: 'color' }}
                pointSize={10}
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
        </>
      )}
    </div>
  );
};
