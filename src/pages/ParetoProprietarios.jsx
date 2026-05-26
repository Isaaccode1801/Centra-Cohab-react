import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { BarChart3, Users } from 'lucide-react';
import './Pareto.css';

const ValueLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.data.valorFormatado;
    const valueInMi = (Number(value) / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
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
        {`${valueInMi} Mi`}
      </text>
    );
  });
};

export const ParetoProprietarios = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paretoRes, propRes] = await Promise.all([
          api.get('/pareto_proprietarios'),
          api.get('/data_proprietarios')
        ]);
        
        // Transform pareto data
        const transformedData = paretoRes.data.map(item => {
          const valorFormatado = parseFloat(item.valor_total.replace(/\./g, '').replace(',', '.'));
          const cumPorcentagem = parseFloat(item.cum_porcentagem.replace(',', '.'));
          return {
            ...item,
            grupo_50: item.grupo_50.toString(),
            valorFormatado,
            cumPorcentagem,
            cor: cumPorcentagem <= 50 ? "#00f0ff" : cumPorcentagem <= 80 ? "#7000ff" : "#ff4d4d"
          };
        });
        
        setData(transformedData);
        setProprietarios(propRes.data);
        if (propRes.data.length > 0) {
          setSelectedGroup(propRes.data[0].grupo_50);
        }
      } catch (err) {
        setError('Falha ao carregar dados. Verifique a conexão com o backend.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Carregando dados de Pareto...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  const totalClients = proprietarios.reduce((acc, curr) => acc + curr.clientes.length, 0);

  let clientsClassA = 0;
  let clientsClassB = 0;
  let clientsClassC = 0;

  if (data.length > 0) {
    data.forEach(item => {
      const groupData = proprietarios.find(g => g.grupo_50.toString() === item.grupo_50.toString());
      const numClients = groupData ? groupData.clientes.length : 0;
      if (item.cumPorcentagem <= 50) {
        clientsClassA += numClients;
      } else if (item.cumPorcentagem <= 80) {
        clientsClassB += numClients;
      } else {
        clientsClassC += numClients;
      }
    });
  }

  const currentGroupData = proprietarios.find(g => g.grupo_50 === selectedGroup) || { clientes: [] };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><BarChart3 size={24} /> Análise de Pareto ABC - Proprietários</h1>
        <p className="subtitle">Visualização de desempenho por bloco de clientes e análise de valor acumulado.</p>
      </header>

      <div className="metrics-row">
        <div className="metric-card glass-panel">
          <span className="metric-label">clientes na classe A:</span>
          <span className="metric-value">{clientsClassA}</span>
          <span className="metric-desc">Top 50%</span>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-label">clientes na classe B:</span>
          <span className="metric-value">{clientsClassB}</span>
          <span className="metric-desc">51-80%</span>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-label">na classe C:</span>
          <span className="metric-value">{clientsClassC}</span>
          <span className="metric-desc">81-100%</span>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-label">clientes totais</span>
          <span className="metric-value">{totalClients}</span>
          <span className="metric-desc">Dados agrupados por bloco</span>
        </div>
      </div>

      <div className="chart-section glass-panel">
        <div className="chart-header">
          <h3>Gráfico de Pareto</h3>
          <div className="pareto-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#00f0ff' }}></span>Top 50% (Classe A)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#7000ff' }}></span>51–80% (Classe B)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ff4d4d' }}></span>81–100% (Classe C)</span>
          </div>
        </div>
        <div style={{ height: '420px', position: 'relative' }}>
          <ResponsiveBar
            data={data}
            keys={['valorFormatado']}
            indexBy="grupo_50"
            margin={{ top: 30, right: 20, bottom: 55, left: 10 }}
            padding={0.5}
            colors={({ data }) => data.cor}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: -45,
              legend: 'Quantidade de Clientes (Acumulado)',
              legendPosition: 'middle',
              legendOffset: 48
            }}
            axisLeft={null}
            gridYValues={[]}
            enableLabel={false}
            layers={['grid', 'axes', 'bars', 'markers', 'legends', 'annotations', ValueLabels]}
            theme={{
              axis: {
                ticks: { text: { fill: '#cccccc', fontSize: 11 } },
                legend: { text: { fill: '#aaaaaa', fontSize: 12, fontWeight: 500 } }
              },
              grid: { line: { stroke: 'transparent' } },
              labels: { text: { fontSize: 10, fontWeight: 600 } },
              tooltip: { container: { background: '#111', color: '#f0f0f0', borderRadius: '6px' } }
            }}
            tooltip={({ value, data }) => (
              <div style={{ padding: '8px 14px', background: '#111', borderRadius: '6px', fontSize: '0.88rem', lineHeight: 1.6 }}>
                <strong style={{ color: '#00f0ff' }}>Grupo {data.grupo_50}</strong><br />
                Valor: <strong>R$ {Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong><br />
                Acumulado: {data.cumPorcentagem}%
              </div>
            )}
          />
        </div>
      </div>

      <div className="details-section glass-panel">
        <div className="details-header">
          <h3><Users size={20} /> Detalhes dos Clientes por Grupo</h3>
          <select 
            className="group-select" 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(Number(e.target.value))}
          >
            {proprietarios.map(g => (
              <option key={g.grupo_50} value={g.grupo_50}>Grupo {g.grupo_50}</option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Ticket Médio</th>
                <th>Tempo de Casa</th>
                <th>Total Acumulado</th>
                <th>Celular</th>
              </tr>
            </thead>
            <tbody>
              {currentGroupData.clientes.map((cliente, idx) => (
                <tr key={idx}>
                  <td>{cliente.id}</td>
                  <td>{cliente.nome}</td>
                  <td className="highlight-text">R$ {cliente.ticket_medio}</td>
                  <td>{cliente.tempo_de_casa} meses</td>
                  <td>R$ {cliente.total_acumulado}</td>
                  <td>{cliente.celular}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
