import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveBar } from '@nivo/bar';
import { BarChart3, Users } from 'lucide-react';
import './Pareto.css';

const ValueLabels = ({ bars }) => {
  return bars.map(bar => {
    const value = bar.data.data.valorFormatado;
    if (value === undefined || value === null) return null;
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

export const ParetoInquilinos = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [inquilinos, setInquilinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paretoRes, inqRes] = await Promise.all([
          api.get('/pareto_inquilinos'),
          api.get('/data_inquilinos')
        ]);
        
        // Transform pareto data
        const transformedData = paretoRes.data.map(item => {
          const valorFormatado = parseFloat(item.valor_total.replace(/\./g, '').replace(',', '.'));
          const cumPorcentagem = parseFloat(item.cum_porcentagem.replace(',', '.'));
          return {
            ...item,
            grupo_100: item.grupo_100.toString(),
            valorFormatado,
            cumPorcentagem,
            cor: cumPorcentagem <= 50 ? "#00f0ff" : cumPorcentagem <= 80 ? "#7000ff" : "#ff4d4d"
          };
        });
        
        setData(transformedData);
        setInquilinos(inqRes.data);
        if (inqRes.data.length > 0) {
          setSelectedGroup(inqRes.data[0].grupo_100);
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

  const downloadCsv = () => {
    const currentGroupData = inquilinos.find(g => g.grupo_100 === selectedGroup) || { clientes: [] };
    const headers = ['CliCod', 'Nome', 'Ticket Médio', 'Tempo de Casa', 'Total Acumulado', 'Celular'];
    const rows = currentGroupData.clientes.map(c => 
      `${c.CliCod},"${c.nome}","R$ ${c.ticket_medio}","${c.tempo_de_casa} meses","R$ ${c.total_acumulado}",${c.celular}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inquilinos_grupo_${selectedGroup}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Carregando dados de Pareto...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  const totalClients = inquilinos.reduce((acc, curr) => acc + curr.clientes.length, 0);

  let clientsClassA = 0;
  let clientsClassB = 0;
  let clientsClassC = 0;

  if (data.length > 0) {
    data.forEach(item => {
      const groupData = inquilinos.find(g => g.grupo_100.toString() === item.grupo_100.toString());
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

  const totalValue = data.reduce((acc, curr) => acc + curr.valorFormatado, 0);

  const currentGroupData = inquilinos.find(g => g.grupo_100 === selectedGroup) || { clientes: [] };

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><BarChart3 size={24} /> Análise de Pareto ABC - Inquilinos</h1>
        <p className="subtitle">Visualização de desempenho por bloco de inquilinos e participação acumulada.</p>
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
          <span className="metric-label">Acumulado total</span>
          <span className="metric-value">R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          <span className="metric-desc">Soma dos blocos analisados</span>
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
            indexBy="grupo_100"
            margin={{ top: 30, right: 20, bottom: 55, left: 10 }}
            padding={0.5}
            colors={({ data }) => data.cor}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickRotation: -45,
              legend: 'Quantidade de Inquilinos (Acumulado)',
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
                <strong style={{ color: '#00f0ff' }}>Grupo {data.grupo_100}</strong><br />
                Valor: <strong>R$ {Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong><br />
                Acumulado: {data.cumPorcentagem}%
              </div>
            )}
          />
        </div>
      </div>

      <div className="details-section glass-panel">
        <div className="details-header">
          <h3><Users size={20} /> Detalhes dos Inquilinos por Grupo</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={downloadCsv} className="download-btn">Baixar CSV</button>
            <select 
              className="group-select" 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(Number(e.target.value))}
            >
              {inquilinos.map(g => (
                <option key={g.grupo_100} value={g.grupo_100}>Grupo {g.grupo_100}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>CliCod</th>
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
                  <td>{cliente.CliCod}</td>
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
