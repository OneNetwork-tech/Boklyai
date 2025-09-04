import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await api.getCompanyById(Number(id));
        setCompany(data);
      } catch (err) {
        console.error('Failed to fetch company', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCompany();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p>Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p>Company not found.</p>
          <Link to="/companies" className="btn btn-primary mt-4">
            Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/companies" className="text-blue-600 hover:underline">
          &larr; Back to Companies
        </Link>
      </div>
      
      <div className="card mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{company.name}</h1>
            <p className="text-gray-600">Organization Number: {company.organizationNumber}</p>
            {company.vatNumber && <p className="text-gray-600">VAT Number: {company.vatNumber}</p>}
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {company.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {(company.address || company.city || company.postalCode || company.country) && (
          <div className="mt-4">
            <p className="text-gray-600">
              {company.address && `${company.address}, `}
              {company.postalCode && `${company.postalCode} `}
              {company.city && `${company.city}, `}
              {company.country}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('banking')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'banking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Banking
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('invoicing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoicing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoicing
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payroll'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payroll
            </button>
          </nav>
        </div>

        <div className="py-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Company Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Financial Summary</h3>
                  <p className="mt-2 text-gray-600">Total Revenue: 0.00 SEK</p>
                  <p className="text-gray-600">Total Expenses: 0.00 SEK</p>
                  <p className="text-gray-600">Net Income: 0.00 SEK</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Bank Accounts</h3>
                  <p className="mt-2 text-gray-600">Connected Accounts: 0</p>
                  <p className="text-gray-600">Total Balance: 0.00 SEK</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Recent Activity</h3>
                  <p className="mt-2 text-gray-600">No recent activity</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Bank Accounts</h2>
                <Link to="/bank-accounts" className="btn btn-primary">
                  Manage Bank Accounts
                </Link>
              </div>
              <p className="text-gray-600">No bank accounts connected yet.</p>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Transactions</h2>
                <Link to="/transactions" className="btn btn-primary">
                  View All Transactions
                </Link>
              </div>
              <p className="text-gray-600">No transactions recorded yet.</p>
            </div>
          )}

          {activeTab === 'invoicing' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Invoices & Bills</h2>
                <div>
                  <Link to="/invoices" className="btn btn-primary mr-2">
                    Manage Invoices
                  </Link>
                  <Link to="/bills" className="btn btn-secondary">
                    Manage Bills
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Invoices</h3>
                  <p className="mt-2 text-gray-600">Total Invoices: 0</p>
                  <p className="text-gray-600">Outstanding: 0.00 SEK</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Bills</h3>
                  <p className="mt-2 text-gray-600">Total Bills: 0</p>
                  <p className="text-gray-600">Outstanding: 0.00 SEK</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Payroll</h2>
                <Link to="/payroll" className="btn btn-primary">
                  Manage Payroll
                </Link>
              </div>
              <p className="text-gray-600">No payroll data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;