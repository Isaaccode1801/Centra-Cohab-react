import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, Target, Activity, FileText, CheckCircle,
  Map, LayoutDashboard, FileX, CalendarDays, TrendingUp,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoImg from '../assets/performance logo horizontal (1).png';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Central Cohab', icon: Home },
  { path: '/pareto-proprietarios', label: 'Pareto Proprietários', icon: Users },
  { path: '/pareto-inquilinos', label: 'Pareto Inquilinos', icon: Users },
  { path: '/cohort', label: 'Análise de Cohort', icon: Target },
  { path: '/rfm-inquilinos', label: 'RFM Inquilinos', icon: Activity },
  { path: '/locacoes', label: 'Locações', icon: Map },
  { path: '/captacao', label: 'Captação', icon: LayoutDashboard },
  { path: '/contratos-rescisao', label: 'Contratos Rescisão', icon: FileX },
  { path: '/contratos-renovacao', label: 'Contratos Renovação', icon: CalendarDays },
  { path: '/contratos-ativos', label: 'Contratos Ativos', icon: FileText },
  { path: '/indicadores-principais', label: 'Indicadores Principais', icon: CheckCircle },
  { path: '/metometro', label: 'Metômetro', icon: TrendingUp },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const { logout } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      </button>

      {/* Logo / Header */}
      <div className="sidebar-logo">
        {!collapsed && (
          <div className="sidebar-brand-container">
            <img src={logoImg} alt="Performance Logo" className="sidebar-logo-img" />
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={19} className="nav-icon" />
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout} title="Sair da conta">
          <LogOut size={17} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};
