import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ParetoProprietarios } from './pages/ParetoProprietarios';
import { ParetoInquilinos } from './pages/ParetoInquilinos';
import { IndicadoresPrincipais } from './pages/IndicadoresPrincipais';
import { Metometro } from './pages/Metometro';
import { Cohort } from './pages/Cohort';
import { RfmInquilinos } from './pages/RfmInquilinos';
import { Locacoes } from './pages/Locacoes';
import { Captacao } from './pages/Captacao';
import { ContratosRescisao } from './pages/ContratosRescisao';
import { ContratosRenovacao } from './pages/ContratosRenovacao';
import { ContratosAtivos } from './pages/ContratosAtivos';
import './pages/Dashboard.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pareto-proprietarios" element={<ParetoProprietarios />} />
            <Route path="pareto-inquilinos" element={<ParetoInquilinos />} />
            <Route path="cohort" element={<Cohort />} />
            <Route path="rfm-inquilinos" element={<RfmInquilinos />} />
            <Route path="locacoes" element={<Locacoes />} />
            <Route path="captacao" element={<Captacao />} />
            <Route path="contratos-rescisao" element={<ContratosRescisao />} />
            <Route path="contratos-renovacao" element={<ContratosRenovacao />} />
            <Route path="contratos-ativos" element={<ContratosAtivos />} />
            <Route path="indicadores-principais" element={<IndicadoresPrincipais />} />
            <Route path="metometro" element={<Metometro />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
