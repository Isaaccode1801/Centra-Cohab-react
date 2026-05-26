import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { 
  BarChart3, PieChart, Users, Coins, Tag, Calendar, 
  RefreshCw, Search, Download, Globe, LineChart 
} from 'lucide-react';
import './RfmInquilinos.css';

const getLetter = (id) => {
  if (!id) return '';
  const match = id.match(/^([A-K])\s*-\s*/);
  if (match) return match[1];
  return id.substring(0, 1).toUpperCase();
};

const ValueLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.data.value;
    const percentual = bar.data.data.percentual;
    if (value === undefined || value === null) return null;
    
    const labelText = `${value} (${percentual.toFixed(1)}%)`;
    const isSmall = bar.width < 95; // Threshold in SVG pixels
    
    const x = isSmall ? bar.x + bar.width + 8 : bar.x + bar.width / 2;
    const textAnchor = isSmall ? "start" : "middle";
    const fill = "#ffffff";
    
    return (
      <text
        key={bar.key}
        x={x}
        y={bar.y + bar.height / 2}
        dy="0.35em"
        textAnchor={textAnchor}
        fill={fill}
        fontSize="10px"
        fontWeight="600"
      >
        {labelText}
      </text>
    );
  });
};

const RecenciaLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.value;
    if (value === undefined || value === null) return null;
    return (
      <text
        key={bar.key}
        x={bar.x + bar.width / 2}
        y={bar.y - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="600"
      >
        {Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
      </text>
    );
  });
};

const FrequenciaLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.value;
    if (value === undefined || value === null) return null;
    return (
      <text
        key={bar.key}
        x={bar.x + bar.width / 2}
        y={bar.y - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="600"
      >
        {Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
      </text>
    );
  });
};

const TicketLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.value;
    if (value === undefined || value === null) return null;
    return (
      <text
        key={bar.key}
        x={bar.x + bar.width / 2}
        y={bar.y - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="600"
      >
        {`R$ ${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
      </text>
    );
  });
};

const FaturamentoLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.value;
    if (value === undefined || value === null) return null;
    return (
      <text
        key={bar.key}
        x={bar.x + bar.width / 2}
        y={bar.y - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10px"
        fontWeight="600"
      >
        {`R$ ${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
      </text>
    );
  });
};

export const RfmInquilinos = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/rfm_inquilinos');
        
        // Ensure values are properly converted to numbers
        const transformedData = response.data.map(item => {
          return {
            ...item,
            recenciaNum: parseFloat(String(item.recencia).replace(/\./g, '').replace(',', '.')) || 0,
            frequenciaNum: parseFloat(String(item.frequencia).replace(/\./g, '').replace(',', '.')) || 0,
            monetarioNum: parseFloat(String(item.monetario).replace(/\./g, '').replace(',', '.')) || 0,
          };
        });
        
        setData(transformedData);
        
        // Auto-select first group for the list tab
        const uniqueGroups = [...new Set(transformedData.map(d => d.segmento_final))].sort();
        if (uniqueGroups.length > 0) {
          setGrupoSelecionado(uniqueGroups[0]);
        }
      } catch (err) {
        setError('Falha ao carregar dados de RFM.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  // Derived calculations
  const totalClientesBase = data.length;
  
  // Group by segment
  const resumoSegmentos = data.reduce((acc, curr) => {
    const seg = curr.segmento_final;
    if (!acc[seg]) {
      acc[seg] = { 
        id: seg, 
        label: seg,
        qtdClientes: 0, 
        faturamentoTotal: 0, 
        somaRecencia: 0, 
        somaFrequencia: 0 
      };
    }
    acc[seg].qtdClientes += 1;
    acc[seg].faturamentoTotal += curr.monetarioNum;
    acc[seg].somaRecencia += curr.recenciaNum;
    acc[seg].somaFrequencia += curr.frequenciaNum;
    return acc;
  }, {});

  const resumoArray = Object.values(resumoSegmentos).map(seg => ({
    ...seg,
    percentualClientes: (seg.qtdClientes / totalClientesBase) * 100,
    monetarioMedio: seg.faturamentoTotal / seg.qtdClientes,
    recenciaMedia: seg.somaRecencia / seg.qtdClientes,
    frequenciaMedia: seg.somaFrequencia / seg.qtdClientes
  }));

  // Formatters
  const formatMoeda = (val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMilhar = (val) => Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Render Tabs
  const renderGeral = () => {
    const chartData = [...resumoArray]
      .map(seg => ({
        id: seg.id,
        label: seg.label,
        value: seg.qtdClientes,
        faturamento: seg.faturamentoTotal,
        percentual: seg.percentualClientes
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return (
      <div className="tab-content animate-fade-in">
        <div className="chart-section-header">
          <div>
            <h3>Matriz Proporcional por Volume de Clientes</h3>
            <p className="tab-desc">
              {chartType === 'bar' 
                ? 'A distribuição horizontal reflete a quantidade de clientes em cada segmento.' 
                : 'A distribuição circular reflete a quantidade de clientes em cada segmento.'}
            </p>
          </div>
          <div className="chart-type-toggle">
            <button 
              className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
              title="Visualizar em gráfico de barras laterais"
            >
              <BarChart3 size={15} /> Barras
            </button>
            <button 
              className={`chart-type-btn ${chartType === 'pie' ? 'active' : ''}`}
              onClick={() => setChartType('pie')}
              title="Visualizar em gráfico de rosca"
            >
              <PieChart size={15} /> Rosca
            </button>
          </div>
        </div>
        
        <div className="pie-chart-container glass-panel">
          {chartType === 'bar' ? (
            <ResponsiveBar
              data={chartData}
              keys={['value']}
              indexBy="id"
              layout="horizontal"
              margin={{ top: 20, right: 80, bottom: 50, left: 140 }}
              padding={0.35}
              colors="#7000ff"
              enableLabel={false}
              layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', ValueLabels]}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
              }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                legend: 'Quantidade de Clientes',
                legendPosition: 'middle',
                legendOffset: 38
              }}
              enableGridX={true}
              enableGridY={false}
              theme={{
                axis: {
                  ticks: { text: { fill: '#cccccc', fontSize: 11 } },
                  legend: { text: { fill: '#aaaaaa', fontSize: 12, fontWeight: 500 } }
                },
                grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                labels: { text: { fontSize: 10, fontWeight: 600, fill: '#ffffff' } },
                tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
              }}
              tooltip={({ id, value, color, data }) => (
                <div className="chart-tooltip" style={{ borderColor: color }}>
                  <strong>Segmento: {id}</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Users size={14} /> Qtd Clientes: {value}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><BarChart3 size={14} /> Representatividade: {data.percentual.toFixed(2)}%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Coins size={14} /> Faturamento: {formatMoeda(data.faturamento)}</span>
                </div>
              )}
            />
          ) : (
            <ResponsivePie
              data={chartData}
              margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: 'category10' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="var(--text-primary)"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [ [ 'darker', 2 ] ] }}
              valueFormat={value => `${value} clientes`}
              tooltip={({ datum: { id, value, color, data } }) => (
                <div className="chart-tooltip" style={{ borderColor: color }}>
                  <strong>Segmento: {id}</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Users size={14} /> Qtd Clientes: {value}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><BarChart3 size={14} /> Representatividade: {data.percentual.toFixed(2)}%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Coins size={14} /> Faturamento: {formatMoeda(data.faturamento)}</span>
                </div>
              )}
            />
          )}
        </div>
      </div>
    );
  };

  const renderComparativa = () => {
    // Sort array alphabetically by segment name
    const sortedData = [...resumoArray].sort((a, b) => a.id.localeCompare(b.id));

    return (
      <div className="tab-content animate-fade-in">
        <h3><BarChart3 size={20} /> Análise Comparativa por Segmento</h3>
        <p className="tab-desc">Métricas médias e totais detalhadas por comportamento de grupo.</p>

        <div className="rfm-legend-container glass-panel">
          <div className="rfm-legend-title"><Tag size={16} /> Legenda de Segmentos</div>
          {[
            { key: 'A', name: 'Campeões' },
            { key: 'B', name: 'Clientes Fiéis' },
            { key: 'C', name: 'Fiéis em Potencial' },
            { key: 'D', name: 'Novos Clientes' },
            { key: 'E', name: 'Clientes Promissores' },
            { key: 'F', name: 'Precisam de Atenção' },
            { key: 'G', name: 'Quase Dormentes' },
            { key: 'H', name: 'Não podemos perder' },
            { key: 'I', name: 'Clientes em risco' },
            { key: 'J', name: 'Clientes hibernando' },
            { key: 'K', name: 'Clientes perdidos' }
          ].map(item => (
            <div key={item.key} className="rfm-legend-item">
              <span className="rfm-legend-badge">{item.key}</span>
              <span className="rfm-legend-name">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="charts-grid">
          <div className="chart-wrapper glass-panel">
            <h4><Calendar size={18} /> Recência Média (dias)</h4>
            <div className="bar-chart-container">
              <ResponsiveBar
                data={sortedData}
                keys={['recenciaMedia']}
                indexBy="id"
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                padding={0.35}
                colors="#1f77b4"
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickRotation: 0,
                  format: getLetter
                }}
                axisLeft={null}
                enableLabel={false}
                layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', RecenciaLabels]}
                theme={{
                  axis: {
                    ticks: { text: { fill: '#ffffff', fontSize: 10, fontWeight: 600 } }
                  },
                  grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                  tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
                }}
                tooltip={({ id, value }) => (
                  <div className="chart-tooltip"><strong>{id}</strong><br/>{formatMilhar(value)} dias</div>
                )}
              />
            </div>
          </div>

          <div className="chart-wrapper glass-panel">
            <h4><RefreshCw size={18} /> Frequência Média</h4>
            <div className="bar-chart-container">
              <ResponsiveBar
                data={sortedData}
                keys={['frequenciaMedia']}
                indexBy="id"
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                padding={0.35}
                colors="#FFD700"
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickRotation: 0,
                  format: getLetter
                }}
                axisLeft={null}
                enableLabel={false}
                layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', FrequenciaLabels]}
                theme={{
                  axis: {
                    ticks: { text: { fill: '#ffffff', fontSize: 10, fontWeight: 600 } }
                  },
                  grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                  tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
                }}
                tooltip={({ id, value }) => (
                  <div className="chart-tooltip"><strong>{id}</strong><br/>{formatMilhar(value)} locações</div>
                )}
              />
            </div>
          </div>

          <div className="chart-wrapper glass-panel">
            <h4><Coins size={18} /> Ticket Médio (R$)</h4>
            <div className="bar-chart-container">
              <ResponsiveBar
                data={sortedData}
                keys={['monetarioMedio']}
                indexBy="id"
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                padding={0.35}
                colors="#FF8C00"
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickRotation: 0,
                  format: getLetter
                }}
                axisLeft={null}
                enableLabel={false}
                layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', TicketLabels]}
                theme={{
                  axis: {
                    ticks: { text: { fill: '#ffffff', fontSize: 10, fontWeight: 600 } }
                  },
                  grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                  tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
                }}
                tooltip={({ id, value }) => (
                  <div className="chart-tooltip"><strong>{id}</strong><br/>{formatMoeda(value)}</div>
                )}
              />
            </div>
          </div>

          <div className="chart-wrapper glass-panel">
            <h4><Coins size={18} /> Faturamento Total (R$)</h4>
            <div className="bar-chart-container">
              <ResponsiveBar
                data={sortedData}
                keys={['faturamentoTotal']}
                indexBy="id"
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                padding={0.35}
                colors="#2ca02c"
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 8,
                  tickRotation: 0,
                  format: getLetter
                }}
                axisLeft={null}
                enableLabel={false}
                layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', FaturamentoLabels]}
                theme={{
                  axis: {
                    ticks: { text: { fill: '#ffffff', fontSize: 10, fontWeight: 600 } }
                  },
                  grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                  tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
                }}
                tooltip={({ id, value }) => (
                  <div className="chart-tooltip"><strong>{id}</strong><br/>{formatMoeda(value)}</div>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLista = () => {
    const segmentosUnicos = [...new Set(data.map(d => d.segmento_final))].sort();
    const clientesFiltrados = data.filter(d => d.segmento_final === grupoSelecionado);

    const downloadCSV = () => {
      const headers = ['CliCod', 'CliNom', 'Recencia', 'Frequencia', 'Monetario'];
      const rows = clientesFiltrados.map(c => 
        `${c.CliCod},"${c.CliNom}",${c.recenciaNum},${c.frequenciaNum},"${formatMoeda(c.monetarioNum)}"`
      );
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `rfm_clientes_${grupoSelecionado}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="tab-content animate-fade-in">
        <div className="list-header glass-panel">
          <div>
            <h3><Search size={20} /> Detalhar Membros do Grupo</h3>
            <p className="tab-desc">Visualizando {clientesFiltrados.length} clientes no grupo <strong>{grupoSelecionado}</strong></p>
          </div>
          <div className="list-actions">
            <select 
              className="rfm-select" 
              value={grupoSelecionado} 
              onChange={e => setGrupoSelecionado(e.target.value)}
            >
              {segmentosUnicos.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
            <button onClick={downloadCSV} className="rfm-btn-export"><Download size={16} /> Baixar Lista (CSV)</button>
          </div>
        </div>

        <div className="rfm-table-container glass-panel">
          <table className="rfm-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Recência (dias)</th>
                <th>Frequência</th>
                <th>Monetário</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente, idx) => (
                <tr key={idx}>
                  <td>{cliente.CliCod}</td>
                  <td>{cliente.CliNom}</td>
                  <td>{formatMilhar(cliente.recenciaNum)}</td>
                  <td>{formatMilhar(cliente.frequenciaNum)}</td>
                  <td className="highlight-text">{formatMoeda(cliente.monetarioNum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Carregando dados RFM...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><BarChart3 size={24} /> Análise RFM - Inquilinos</h1>
        <p className="subtitle">Visualização segmentada para análise de comportamento e valor dos clientes.</p>
      </header>

      <div className="rfm-tabs">
        <button className={`rfm-tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}><LineChart size={16} /> Visão Geral</button>
        <button className={`rfm-tab-btn ${activeTab === 'comparativa' ? 'active' : ''}`} onClick={() => setActiveTab('comparativa')}><Globe size={16} /> Análise Quantitativa</button>
        <button className={`rfm-tab-btn ${activeTab === 'lista' ? 'active' : ''}`} onClick={() => setActiveTab('lista')}><Search size={16} /> Lista de Clientes</button>
      </div>

      {activeTab === 'geral' && renderGeral()}
      {activeTab === 'comparativa' && renderComparativa()}
      {activeTab === 'lista' && renderLista()}

    </div>
  );
};
