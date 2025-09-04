import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import BankAccountsPage from './pages/BankAccountsPage';
import TransactionsPage from './pages/TransactionsPage';
import InvoicesPage from './pages/InvoicesPage';
import BillsPage from './pages/BillsPage';
import PayrollPage from './pages/PayrollPage';
import ReportsPage from './pages/ReportsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<><Navigation /><DashboardPage /></>} />
          <Route path="/companies" element={<><Navigation /><CompaniesPage /></>} />
          <Route path="/companies/:id" element={<><Navigation /><CompanyDetailPage /></>} />
          <Route path="/bank-accounts" element={<><Navigation /><BankAccountsPage /></>} />
          <Route path="/transactions" element={<><Navigation /><TransactionsPage /></>} />
          <Route path="/invoices" element={<><Navigation /><InvoicesPage /></>} />
          <Route path="/bills" element={<><Navigation /><BillsPage /></>} />
          <Route path="/payroll" element={<><Navigation /><PayrollPage /></>} />
          <Route path="/reports" element={<><Navigation /><ReportsPage /></>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;