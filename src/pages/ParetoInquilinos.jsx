import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, BarXAxis, Grid, ChartTooltip, BarLineIndicator } from "../components/BarChart";
import { Users } from 'lucide-react';
import { ParetoIcon } from '../components/ParetoIcon';
import './Pareto.css';


export const ParetoInquilinos = () => {
  const { api } = useAuth();
  const [data, setData] = useState([]);
  const [inquilinos, setInquilinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedClass, setSelectedClass] = useState('Todas');

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
        
        const maxVal = Math.max(...transformedData.map(d => d.valorFormatado), 1);
        let runningTotal = 0;
        const finalData = transformedData.map(item => {
          runningTotal += item.valorFormatado;
          return {
            ...item,
            cumulativoAbsoluto: runningTotal,
            cumPorcentagemScaled: (item.cumPorcentagem / 100) * maxVal
          };
        });

        setData(finalData);
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

  useEffect(() => {
    // Quando a classe selecionada muda, garantimos que o grupo selecionado pertence a ela
    if (selectedClass !== 'Todas' && data.length > 0 && inquilinos.length > 0) {
      const gruposNaClasse = inquilinos.filter(g => {
        const d = data.find(item => item.grupo_100.toString() === g.grupo_100.toString());
        if (!d) return false;
        if (selectedClass === 'A') return d.cumPorcentagem <= 50;
        if (selectedClass === 'B') return d.cumPorcentagem > 50 && d.cumPorcentagem <= 80;
        if (selectedClass === 'C') return d.cumPorcentagem > 80;
        return false;
      });
      
      const grupoAtualValido = gruposNaClasse.some(g => g.grupo_100.toString() === selectedGroup.toString());
      if (!grupoAtualValido && gruposNaClasse.length > 0) {
        setSelectedGroup(gruposNaClasse[0].grupo_100);
      }
    }
  }, [selectedClass, data, inquilinos, selectedGroup]);

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
        <h1><ParetoIcon size={24} /> Análise de Pareto ABC - Inquilinos</h1>
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

      <div className="chart-section glass-panel" style={{ position: 'relative', zIndex: 1, isolation: 'isolate' }}>
        <div className="chart-header">
          <h3>Gráfico de Pareto</h3>
          <div className="pareto-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#00f0ff' }}></span>Top 50% (Classe A)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#7000ff' }}></span>51–80% (Classe B)</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#ff4d4d' }}></span>81–100% (Classe C)</span>
          </div>
        </div>
        <div style={{ height: '400px', position: 'relative' }}>
          <BarChart
            data={data}
            xDataKey="grupo_100"
            orientation="vertical"
            margin={{ top: 20, right: 10, bottom: 40, left: 10 }}
            barGap={0.4}
            aspectRatio="auto"
          >
            <Grid horizontal={true} vertical={false} />
            <BarXAxis showAllLabels={true} />
            <Bar
              dataKey="valorFormatado"
              fill={(d) => d.cor}
              showValues={true}
              valueFormatter={(v) => `${(v / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} Mi`}
            />
            <BarLineIndicator
              valueKey="cumPorcentagemScaled"
              xKey="grupo_100"
              labelKey="cumulativoAbsoluto"
              stroke="#a855f7"
              strokeWidth={3}
              valueFormatter={(v) => {
                if (v == null || isNaN(v)) return '';
                return `R$ ${(Number(v) / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Mi`;
              }}
            />
            <ChartTooltip
              rows={(point) => [
                {
                  color: point.cor,
                  label: 'Valor',
                  value: `R$ ${Number(point.valorFormatado).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                },
                {
                  color: '#a855f7',
                  label: 'Acumulado',
                  value: `R$ ${(point.cumulativoAbsoluto / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} Mi (${point.cumPorcentagem}%)`
                }
              ]}
            />
          </BarChart>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#888', fontWeight: '500', marginTop: '8px' }}>
            Quantidade de Inquilinos (Acumulado)
          </div>
        </div>
      </div>

      <div className="details-section glass-panel" style={{ position: 'relative', zIndex: 5 }}>
        <div className="details-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 10 }}>
          <h3 style={{ margin: 0 }}><Users size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Detalhes dos Inquilinos por Grupo</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={downloadCsv} className="download-btn">Baixar CSV</button>
            <select 
              className="group-select" 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ minWidth: '120px' }}
            >
              <option value="Todas">Todas as Classes</option>
              <option value="A">Classe A (Top 50%)</option>
              <option value="B">Classe B (51-80%)</option>
              <option value="C">Classe C (81-100%)</option>
            </select>
            <select 
              className="group-select" 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(Number(e.target.value))}
              style={{ minWidth: '120px' }}
            >
              {inquilinos.filter(g => {
                if (selectedClass === 'Todas') return true;
                const d = data.find(item => item.grupo_100.toString() === g.grupo_100.toString());
                if (!d) return false;
                if (selectedClass === 'A') return d.cumPorcentagem <= 50;
                if (selectedClass === 'B') return d.cumPorcentagem > 50 && d.cumPorcentagem <= 80;
                if (selectedClass === 'C') return d.cumPorcentagem > 80;
                return true;
              }).map(g => (
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
