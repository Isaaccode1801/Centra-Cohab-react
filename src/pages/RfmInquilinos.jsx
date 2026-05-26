import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ChartContainer';
import {
  BarChart3, PieChart, Users, Coins, Tag, Calendar, 
  RefreshCw, Search, Download, Globe, LineChart, LayoutDashboard
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
        fontSize="14px"
        fontWeight="600"
      >
        {labelText}
      </text>
    );
  });
};



// ── Compact Number Formatter ──────────────────────────────────────────────────
const formatCompacto = (value, isMonetary = false) => {
  if (value === undefined || value === null) return '';
  const num = Number(value);
  if (num >= 1000000) {
    const format = (num / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isMonetary ? `R$ ${format} MI` : `${format} MI`;
  }
  if (num >= 1000) {
    const format = (num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isMonetary ? `R$ ${format} MIL` : `${format} MIL`;
  }
  return isMonetary 
    ? `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

// ── Recharts custom label for bar tops ──────────────────────────────────────
const BarTopLabel = ({ x, y, width, value, formatter, payload, activeSegment }) => {
  if (value === undefined || value === null || value === 0) return null;
  if (activeSegment && payload && getLetter(payload.id) !== activeSegment) return null;
  const display = formatter ? formatter(value) : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#ffffff"
      fontSize={14}
      fontWeight={600}
    >
      {display}
    </text>
  );
};

export const RfmInquilinos = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [segmentoAtivo, setSegmentoAtivo] = useState(null);

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
              margin={{ top: 20, right: 80, bottom: 20, left: 140 }}
              padding={0.35}
              colors="#7000ff"
              enableLabel={false}
              layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', ValueLabels]}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
              }}
              axisBottom={null}
              enableGridX={false}
              enableGridY={false}
              theme={{
                axis: {
                  ticks: { text: { fill: '#cccccc', fontSize: 14 } },
                  legend: { text: { fill: '#aaaaaa', fontSize: 16, fontWeight: 500 } }
                },
                grid: { line: { stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 } },
                labels: { text: { fontSize: 14, fontWeight: 600, fill: '#ffffff' } },
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
              margin={{ top: 20, right: 20, bottom: 80, left: 20 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={[
                '#10b981', '#34d399', '#6ee7b7', '#38bdf8', '#818cf8', 
                '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#ef4444'
              ]}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
              enableArcLinkLabels={false}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              valueFormat={value => `${value}`}
              theme={{
                labels: { text: { fontSize: 16, fontWeight: 'bold' } },
                legends: { text: { fill: '#ffffff', fontSize: 12 } }
              }}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 56,
                  itemsSpacing: 0,
                  itemWidth: 100,
                  itemHeight: 18,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 18,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemTextColor: '#fff'
                      }
                    }
                  ]
                }
              ]}
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

    const estrategias = {
      'A': 'Recompense-os. Podem ser early adopters de novos produtos e promoverão a marca.',
      'B': 'Ofereça produtos de maior valor. Peça por reviews e faça o possível para engajá-los.',
      'C': 'Ofereça programas de membros ou de lealdade, além de recomendar outros produtos.',
      'D': 'Dê todo o suporte no onboarding para acelerar o sucesso. Comece a construir um relacionamento.',
      'E': 'Crie awareness para a sua marca e ofereça testes ou avaliações gratuitas.',
      'F': 'Ofereça ofertas por tempo limitado baseadas em compras anteriores para reativá-los.',
      'G': 'Compartilhe recursos valiosos.',
      'H': 'Converse diretamente e ofereça benefícios premium para retenção.',
      'I': 'Envie ofertas agressivas e personalizadas para tentar recuperá-los.',
      'J': 'Crie campanhas de reativação padrão com foco em novidades.',
      'K': 'Avalie se vale o custo de aquisição para trazê-los de volta.'
    };

    return (
      <div className="tab-content animate-fade-in" style={{ marginTop: '32px' }}>
        <h3><BarChart3 size={20} /> Análise Comparativa por Segmento</h3>
        <p className="tab-desc">Métricas médias e totais detalhadas por comportamento de grupo. Clique nos segmentos da legenda para focar as barras nos gráficos.</p>

        <div className="rfm-legend-container glass-panel">
          <div className="rfm-legend-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><Tag size={16} /> Legenda de Segmentos</span>
            {segmentoAtivo && (
              <button 
                onClick={() => setSegmentoAtivo(null)}
                style={{
                  background: 'rgba(112,0,255,0.15)',
                  border: '1px solid rgba(112,0,255,0.3)',
                  color: '#b080ff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Limpar Filtro
              </button>
            )}
          </div>
          {[
            { key: 'A', name: 'Campeões', color: '#2ca02c' },
            { key: 'B', name: 'Clientes Fiéis', color: '#1f77b4' },
            { key: 'C', name: 'Fiéis em Potencial', color: '#7ab8ff' },
            { key: 'D', name: 'Novos Clientes', color: '#ffbb78' },
            { key: 'E', name: 'Clientes Promissores', color: '#98df8a' },
            { key: 'F', name: 'Precisam de Atenção', color: '#ff7f0e' },
            { key: 'G', name: 'Quase Dormentes', color: '#ff9896' },
            { key: 'H', name: 'Não podemos perder', color: '#d62728' },
            { key: 'I', name: 'Clientes em risco', color: '#e377c2' },
            { key: 'J', name: 'Clientes hibernando', color: '#c5b0d5' },
            { key: 'K', name: 'Clientes perdidos', color: '#7f7f7f' }
          ].map(item => {
            const isCurrentActive = segmentoAtivo === item.key;
            const isDimmed = segmentoAtivo !== null && segmentoAtivo !== item.key;
            return (
              <div 
                key={item.key} 
                className="rfm-legend-item" 
                onClick={() => setSegmentoAtivo(isCurrentActive ? null : item.key)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-start', 
                  padding: '12px', 
                  background: isCurrentActive ? 'rgba(112,0,255,0.1)' : 'rgba(255,255,255,0.03)', 
                  borderRadius: '8px', 
                  marginBottom: '8px', 
                  borderLeft: `4px solid ${isCurrentActive ? '#00f0ff' : item.color}`,
                  boxShadow: isCurrentActive ? '0 0 15px rgba(0,240,255,0.15)' : 'none',
                  opacity: isDimmed ? 0.35 : 1,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="rfm-legend-badge" style={{ fontSize: '14px', fontWeight: 'bold', color: item.color }}>{item.key}</span>
                  <span className="rfm-legend-name" style={{ fontSize: '15px', fontWeight: isCurrentActive ? 'bold' : 'normal', color: isCurrentActive ? '#ffffff' : 'var(--text-primary)' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{estrategias[item.key]}</span>
              </div>
            );
          })}
        </div>

        <div className="charts-grid">
          {/* ── Recência Média ── */}
          <div className="chart-wrapper glass-panel">
            <h4><Calendar size={18} /> Recência Média (dias)</h4>
            <ChartContainer
              className="bar-chart-container"
              config={{ recenciaMedia: { label: 'Recência Média', color: '#1f77b4' } }}
            >
              <ReBarChart
                data={sortedData}
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                barCategoryGap="35%"
              >
                <XAxis
                  dataKey="id"
                  tickFormatter={getLetter}
                  tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent 
                      indicator="dashed" 
                      formatter={(value) => `${formatCompacto(value)} dias`} 
                    />
                  }
                />
                <Bar
                  dataKey="recenciaMedia"
                  fill="var(--color-recenciaMedia)"
                  radius={4}
                >
                  {sortedData.map((entry, index) => {
                    const isSelected = segmentoAtivo === null || getLetter(entry.id) === segmentoAtivo;
                    return (
                      <Cell 
                        key={`cell-rec-${index}`} 
                        fill="var(--color-recenciaMedia)"
                        opacity={isSelected ? 1 : 0.15}
                        style={{ transition: 'opacity 0.3s ease' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="recenciaMedia"
                    content={(props) => (
                      <BarTopLabel {...props} formatter={(v) => formatCompacto(v)} activeSegment={segmentoAtivo} />
                    )}
                  />
                </Bar>
              </ReBarChart>
            </ChartContainer>
          </div>

          {/* ── Frequência Média ── */}
          <div className="chart-wrapper glass-panel">
            <h4><RefreshCw size={18} /> Frequência Média</h4>
            <ChartContainer
              className="bar-chart-container"
              config={{ frequenciaMedia: { label: 'Frequência Média', color: '#FFD700' } }}
            >
              <ReBarChart
                data={sortedData}
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                barCategoryGap="35%"
              >
                <XAxis
                  dataKey="id"
                  tickFormatter={getLetter}
                  tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent 
                      indicator="dashed" 
                      formatter={(value) => `${formatCompacto(value)} locações`} 
                    />
                  }
                />
                <Bar
                  dataKey="frequenciaMedia"
                  fill="var(--color-frequenciaMedia)"
                  radius={4}
                >
                  {sortedData.map((entry, index) => {
                    const isSelected = segmentoAtivo === null || getLetter(entry.id) === segmentoAtivo;
                    return (
                      <Cell 
                        key={`cell-freq-${index}`} 
                        fill="var(--color-frequenciaMedia)"
                        opacity={isSelected ? 1 : 0.15}
                        style={{ transition: 'opacity 0.3s ease' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="frequenciaMedia"
                    content={(props) => (
                      <BarTopLabel {...props} formatter={(v) => formatCompacto(v)} activeSegment={segmentoAtivo} />
                    )}
                  />
                </Bar>
              </ReBarChart>
            </ChartContainer>
          </div>

          {/* ── Ticket Médio ── */}
          <div className="chart-wrapper glass-panel">
            <h4><Coins size={18} /> Ticket Médio (R$)</h4>
            <ChartContainer
              className="bar-chart-container"
              config={{ monetarioMedio: { label: 'Ticket Médio', color: '#FF8C00' } }}
            >
              <ReBarChart
                data={sortedData}
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                barCategoryGap="35%"
              >
                <XAxis
                  dataKey="id"
                  tickFormatter={getLetter}
                  tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent 
                      indicator="dashed" 
                      formatter={(value) => formatCompacto(value, true)} 
                    />
                  }
                />
                <Bar
                  dataKey="monetarioMedio"
                  fill="var(--color-monetarioMedio)"
                  radius={4}
                >
                  {sortedData.map((entry, index) => {
                    const isSelected = segmentoAtivo === null || getLetter(entry.id) === segmentoAtivo;
                    return (
                      <Cell 
                        key={`cell-mon-${index}`} 
                        fill="var(--color-monetarioMedio)"
                        opacity={isSelected ? 1 : 0.15}
                        style={{ transition: 'opacity 0.3s ease' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="monetarioMedio"
                    content={(props) => (
                      <BarTopLabel {...props} formatter={(v) => formatCompacto(v, true)} activeSegment={segmentoAtivo} />
                    )}
                  />
                </Bar>
              </ReBarChart>
            </ChartContainer>
          </div>

          {/* ── Faturamento Total ── */}
          <div className="chart-wrapper glass-panel">
            <h4><Coins size={18} /> Faturamento Total (R$)</h4>
            <ChartContainer
              className="bar-chart-container"
              config={{ faturamentoTotal: { label: 'Faturamento Total', color: '#2ca02c' } }}
            >
              <ReBarChart
                data={sortedData}
                margin={{ top: 30, right: 20, bottom: 50, left: 20 }}
                barCategoryGap="35%"
              >
                <XAxis
                  dataKey="id"
                  tickFormatter={getLetter}
                  tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent 
                      indicator="dashed" 
                      formatter={(value) => formatCompacto(value, true)} 
                    />
                  }
                />
                <Bar
                  dataKey="faturamentoTotal"
                  fill="var(--color-faturamentoTotal)"
                  radius={4}
                >
                  {sortedData.map((entry, index) => {
                    const isSelected = segmentoAtivo === null || getLetter(entry.id) === segmentoAtivo;
                    return (
                      <Cell 
                        key={`cell-fat-${index}`} 
                        fill="var(--color-faturamentoTotal)"
                        opacity={isSelected ? 1 : 0.15}
                        style={{ transition: 'opacity 0.3s ease' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="faturamentoTotal"
                    content={(props) => (
                      <BarTopLabel {...props} formatter={(v) => formatCompacto(v, true)} activeSegment={segmentoAtivo} />
                    )}
                  />
                </Bar>
              </ReBarChart>
            </ChartContainer>
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
        <h1><LayoutDashboard size={24} /> Análise RFM - Inquilinos</h1>
        <p className="subtitle">Visualização segmentada para análise de comportamento e valor dos clientes.</p>
      </header>

      <div className="rfm-tabs">
        <button className={`rfm-tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}><LineChart size={16} /> Visão Geral e Quantitativa</button>
        <button className={`rfm-tab-btn ${activeTab === 'lista' ? 'active' : ''}`} onClick={() => setActiveTab('lista')}><Search size={16} /> Lista de Clientes</button>
      </div>

      {activeTab === 'geral' && (
        <>
          {renderGeral()}
          {renderComparativa()}
        </>
      )}
      {activeTab === 'lista' && renderLista()}

    </div>
  );
};
