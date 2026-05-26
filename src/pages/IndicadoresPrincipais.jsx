import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Target, Building2, TrendingUp, TrendingDown,
  RefreshCw, FileX, KeyRound, Sparkles, Wallet, BarChart3
} from 'lucide-react';
import './IndicadoresPrincipais.css';

const PERIODOS = ['Este mês', 'Este Trimestre', 'Este ano', 'Personalizado'];

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

  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val) ? null : val;
    const str = String(val);
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
      return isNaN(d) ? null : d;
    }
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdMatch) {
      const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
      return isNaN(d) ? null : d;
    }
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

  const formatarMilhar = (valor) => Number(valor).toLocaleString('pt-BR');
  const formatarMoeda = (valor) =>
    `R$ ${Math.round(Number(valor)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>Carregando indicadores...</p></div>;
  if (error) return <div className="error-message">{error}</div>;

  const renovacoesFiltradas = filtrarDados(data.renovacoes, 'data');
  const rescisoesFiltradas  = filtrarDados(data.rescisoes, 'data');
  const locacoesFiltradas   = filtrarDados(data.locacoes, 'data');
  const ativosValidos       = data.ativos.filter(item => item.aluguel && item.CtrCod);

  const qtdAtivos     = new Set(ativosValidos.map(i => i.CtrCod)).size;
  const vglAtivo      = ativosValidos.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);
  const qtdRenovados  = new Set(renovacoesFiltradas.map(i => i.CtrCod)).size;
  const vglRenovado   = renovacoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);
  const qtdRescindidos = rescisoesFiltradas.length;
  const vglRescindido = rescisoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);
  const qtdLocacoes   = new Set(locacoesFiltradas.map(i => i.CtrCod)).size;
  const vglAdquirido  = locacoesFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.aluguel) || 0), 0);

  const periodoIdx = PERIODOS.indexOf(filtroPeriodo);

  return (
    <div className="page-container animate-fade-in">
      <header className="page-header">
        <h1><Target size={24} /> Indicadores Principais</h1>
        <p className="subtitle">Visão consolidada dos principais indicadores da operação.</p>
      </header>

      <div className="filter-section glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
        <div
          className="glass-radio-group"
          style={{
            '--accent-color': 'linear-gradient(135deg, rgba(0, 240, 255, 0.35), rgba(0, 240, 255, 0.75))',
            '--accent-glow': 'rgba(0, 240, 255, 0.45)',
            borderRadius: '16px',
          }}
        >
          {PERIODOS.map((opcao, idx) => (
            <React.Fragment key={opcao}>
              <input
                type="radio"
                name="filtroIndicadores"
                id={`periodo-ind-${idx}`}
                value={opcao}
                checked={filtroPeriodo === opcao}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              />
              <label htmlFor={`periodo-ind-${idx}`}>{opcao}</label>
            </React.Fragment>
          ))}
          <div
            className="glass-glider"
            style={{ borderRadius: '12px', transform: `translateX(${periodoIdx * 100}%)` }}
          />
        </div>

        {filtroPeriodo === 'Personalizado' && (
          <div className="custom-date-filters">
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
            <span>até</span>
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        )}
      </div>

      <div className="indicators-grid">
        {/* Contratos Ativos */}
        <div className="ind-card ind-card--cyan">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--cyan">
            <Building2 size={22} />
          </div>
          <span className="ind-card__label">Contratos Ativos</span>
          <span className="ind-card__value ind-card__value--cyan">{formatarMilhar(qtdAtivos)}</span>
          <span className="ind-card__sub">Total de contratos em vigor</span>
        </div>

        {/* VGL Ativo */}
        <div className="ind-card ind-card--cyan">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--cyan">
            <BarChart3 size={22} />
          </div>
          <span className="ind-card__label">VGL Ativo</span>
          <span className="ind-card__value ind-card__value--cyan">{formatarMoeda(vglAtivo)}</span>
          <span className="ind-card__sub">Valor global de locação ativo</span>
        </div>

        {/* Contratos Renovados */}
        <div className="ind-card ind-card--green">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--green">
            <RefreshCw size={22} />
          </div>
          <span className="ind-card__label">Contratos Renovados</span>
          <span className="ind-card__value ind-card__value--green">{formatarMilhar(qtdRenovados)}</span>
          <span className="ind-card__sub">Renovados no período</span>
        </div>

        {/* VGL Renovado */}
        <div className="ind-card ind-card--green-soft">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--green">
            <TrendingUp size={22} />
          </div>
          <span className="ind-card__label">VGL Renovado</span>
          <span className="ind-card__value ind-card__value--green">{formatarMoeda(vglRenovado)}</span>
          <span className="ind-card__sub">VGL retido por renovação</span>
        </div>

        {/* Contratos Rescindidos */}
        <div className="ind-card ind-card--red">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--red">
            <FileX size={22} />
          </div>
          <span className="ind-card__label">Contratos Rescindidos</span>
          <span className="ind-card__value ind-card__value--red">{formatarMilhar(qtdRescindidos)}</span>
          <span className="ind-card__sub">Rescisões no período</span>
        </div>

        {/* VGL Rescindido */}
        <div className="ind-card ind-card--red-soft">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--red">
            <TrendingDown size={22} />
          </div>
          <span className="ind-card__label">VGL Rescindido</span>
          <span className="ind-card__value ind-card__value--red">{formatarMoeda(vglRescindido)}</span>
          <span className="ind-card__sub">VGL perdido por rescisão</span>
        </div>

        {/* Locações */}
        <div className="ind-card ind-card--purple">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--purple">
            <KeyRound size={22} />
          </div>
          <span className="ind-card__label">Locações</span>
          <span className="ind-card__value ind-card__value--purple">{formatarMilhar(qtdLocacoes)}</span>
          <span className="ind-card__sub">Novas locações no período</span>
        </div>

        {/* VGL Adquirido */}
        <div className="ind-card ind-card--purple">
          <div className="ind-card__icon-wrap ind-card__icon-wrap--purple">
            <Sparkles size={22} />
          </div>
          <span className="ind-card__label">VGL Adquirido</span>
          <span className="ind-card__value ind-card__value--purple">{formatarMoeda(vglAdquirido)}</span>
          <span className="ind-card__sub">VGL captado por novas locações</span>
        </div>
      </div>
    </div>
  );
};
