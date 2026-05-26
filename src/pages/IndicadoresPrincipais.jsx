import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';
import './IndicadoresPrincipais.css';

export const IndicadoresPrincipais = () => {
  const { api } = useAuth();
  const [data, setData] = useState({ ativos: [], renovacoes: [], rescisoes: [], locacoes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filtroPeriodo, setFiltroPeriodo] = useState('Este mês');
  const [dataInicial, setDataInicial] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resAtivos, resRenovacoes, resRescisoes, resLocacoes] = await Promise.all([
          api.get('/ativos'),
          api.get('/renovacoes'),
          api.get('/rescisoes'),
          api.get('/locacoes')
        ]);
        
        setData({
          ativos: resAtivos.data,
          renovacoes: resRenovacoes.data,
          rescisoes: resRescisoes.data,
          locacoes: resLocacoes.data
        });
      } catch (err) {
        setError('Falha ao carregar indicadores principais.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  const obterPeriodoFiltragem = () => {
    const hoje = new Date();
    let inicio, fim;
    
    fim = hoje;
    
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

  // Parses dates — DD/MM/YYYY and YYYY-MM-DD strings are explicitly parsed into LOCAL dates.
  // This avoids the bug where new Date("YYYY-MM-DD") treats the string as UTC, causing it
  // to evaluate to the previous day (e.g. April 30th 21:00) in GMT-3, missing May 1st records.
  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val) ? null : val;
    const str = String(val);
    
    // DD/MM/YYYY — always day-first, create local date
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
      return isNaN(d) ? null : d;
    }
    
    // YYYY-MM-DD (e.g. "2026-05-01"), create local date
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
      const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
      return isNaN(d) ? null : d;
    }
    
    // ISO / Timestamp / date-object string
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  const filtrarDados = (lista, colunaData) => {
    if (!lista || lista.length === 0) return [];
    const { inicio, fim } = obterPeriodoFiltragem();
    
    return lista.filter(item => {
      if (!item[colunaData]) return false;
      const dataItem = parseDate(item[colunaData]);
      if (!dataItem) return false;
      return dataItem >= inicio && dataItem <= fim;
    });
  };

  const formatarMilhar = (valor) => {
    return Number(valor).toLocaleString('pt-BR');
  };

  const formatarMoeda = (valor) => {
    return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Carregando indicadores...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  // Filtros aplicados
  const renovacoesFiltradas = filtrarDados(data.renovacoes, 'data');
  const rescisoesFiltradas = filtrarDados(data.rescisoes, 'data');
  const locacoesFiltradas = filtrarDados(data.locacoes, 'data');
  // Ativos usam a base total disponível, mas podemos manter a coerência de exibição
  const ativosValidos = data.ativos.filter(item => item.aluguel && item.CtrCod);

  // Cálculos
  const qtdAtivos = new Set(ativosValidos.map(i => i.CtrCod)).size;
  const vglAtivo = ativosValidos.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);

  const qtdRenovados = new Set(renovacoesFiltradas.map(i => i.CtrCod)).size;
  const vglRenovado = renovacoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);

  const qtdRescindidos = rescisoesFiltradas.length;
  const vglRescindido = rescisoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);

  const qtdLocacoes = new Set(locacoesFiltradas.map(i => i.CtrCod)).size;
  const vglAdquirido = locacoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><CheckCircle size={24} /> Indicadores Principais</h1>
        <p className="subtitle">Visão consolidada dos principais indicadores da operação.</p>
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

      <div className="indicators-grid">
        <div className="indicator-card glass-panel">
          <span className="indicator-title">Contratos Ativos</span>
          <span className="indicator-value">{formatarMilhar(qtdAtivos)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">VGL Ativo</span>
          <span className="indicator-value highlight">{formatarMoeda(vglAtivo)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">Contratos Renovados</span>
          <span className="indicator-value">{formatarMilhar(qtdRenovados)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">VGL Renovado</span>
          <span className="indicator-value success">{formatarMoeda(vglRenovado)}</span>
        </div>
        
        <div className="indicator-card glass-panel">
          <span className="indicator-title">Contratos Rescindidos</span>
          <span className="indicator-value">{formatarMilhar(qtdRescindidos)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">VGL Rescindido</span>
          <span className="indicator-value danger">{formatarMoeda(vglRescindido)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">Locações</span>
          <span className="indicator-value">{formatarMilhar(qtdLocacoes)}</span>
        </div>
        <div className="indicator-card glass-panel">
          <span className="indicator-title">VGL Adquirido</span>
          <span className="indicator-value highlight">{formatarMoeda(vglAdquirido)}</span>
        </div>
      </div>
    </div>
  );
};
