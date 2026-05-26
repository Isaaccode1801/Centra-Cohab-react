import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export const Layout = () => {
  const { autenticado, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`layout-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main className="main-content">
        <div className="content-wrapper animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
