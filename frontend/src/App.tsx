import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from './session';
import { Spinner } from './components/ui';
import Layout from './components/Layout';
import {
  ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage,
} from './pages/Auth';
import { CompanyPicker, NewCompanyPage } from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import {
  CustomersPage, InvoiceEditor, InvoicesPage, InvoiceView,
} from './pages/Sales';
import {
  BillEditor, BillsPage, BillView, DocumentsPage, SuppliersPage,
} from './pages/Purchases';
import BankPage from './pages/Bank';
import {
  AccountsPage, VoucherEditor, VouchersPage, VoucherView,
} from './pages/Ledger';
import { ReportsPage, VatPage } from './pages/Reports';
import { PayrollPage, PayrollRunPage } from './pages/Payroll';
import SettingsPage from './pages/Settings';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<RequireAuth><CompanyPicker /></RequireAuth>} />
      <Route path="/new-company" element={<RequireAuth><NewCompanyPage /></RequireAuth>} />
      <Route path="/c/:companyId" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceEditor />} />
        <Route path="invoices/:invoiceId" element={<InvoiceView />} />
        <Route path="invoices/:invoiceId/edit" element={<InvoiceEditor />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="bills/new" element={<BillEditor />} />
        <Route path="bills/:billId" element={<BillView />} />
        <Route path="bills/:billId/edit" element={<BillEditor />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="bank" element={<BankPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
        <Route path="vouchers/new" element={<VoucherEditor />} />
        <Route path="vouchers/:voucherId" element={<VoucherView />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="vat" element={<VatPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/:runId" element={<PayrollRunPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
