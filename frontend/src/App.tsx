import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import BillsPage from './pages/BillsPage';
import ReportsPage from './pages/ReportsPage';
import PayrollPage from './pages/PayrollPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import MobileAppPage from './pages/MobileAppPage';
import CollaborationPage from './pages/CollaborationPage';
import AgencyPortalPage from './pages/AgencyPortalPage';

function App() {
  const { t } = useTranslation();

  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/mobile" element={<MobileAppPage />} />
            <Route path="/collaboration" element={<CollaborationPage />} />
            <Route path="/agency" element={<AgencyPortalPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;