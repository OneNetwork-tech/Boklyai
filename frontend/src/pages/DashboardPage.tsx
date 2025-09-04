import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DashboardPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await api.getCompanies();
        setCompanies(data);
      } catch (err) {
        console.error('Failed to fetch companies', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <Link to="/companies" className="btn btn-primary">
          Manage Companies
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h3 className="text-xl font-semibold mb-2">Companies</h3>
              <p className="text-3xl font-bold text-blue-600">{companies.length}</p>
              <p className="text-gray-600">Active businesses</p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold mb-2">Bank Accounts</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-gray-600">Connected accounts</p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold mb-2">Pending Tasks</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
              <p className="text-gray-600">Actions needed</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/bank-accounts" className="btn btn-secondary text-center">
                Bank Accounts
              </Link>
              <Link to="/transactions" className="btn btn-secondary text-center">
                Transactions
              </Link>
              <Link to="/invoices" className="btn btn-secondary text-center">
                Invoices
              </Link>
              <Link to="/bills" className="btn btn-secondary text-center">
                Bills
              </Link>
              <Link to="/payroll" className="btn btn-secondary text-center">
                Payroll
              </Link>
              <Link to="/reports" className="btn btn-secondary text-center">
                Reports
              </Link>
            </div>
          </div>

          <div className="card mt-8">
            <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
            <p className="text-gray-600">No recent activity to display.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;