import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">BoklyAI</h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered Swedish accounting and business management system
        </p>
        
        <div className="flex justify-center gap-4">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Bank Integration</h3>
          <p className="text-gray-600">
            Automatically import and reconcile bank transactions with your accounting records.
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">AI Document Processing</h3>
          <p className="text-gray-600">
            Extract data from invoices, receipts, and other financial documents using OCR and AI.
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Tax Compliance</h3>
          <p className="text-gray-600">
            Generate VAT reports (momsdeklaration) and stay compliant with Swedish tax regulations.
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Invoicing & Payments</h3>
          <p className="text-gray-600">
            Create and send invoices, track payments, and manage accounts receivable.
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Payroll Management</h3>
          <p className="text-gray-600">
            Manage employee payroll with automatic tax calculations and reporting.
          </p>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Financial Reporting</h3>
          <p className="text-gray-600">
            Generate financial statements and track key performance indicators.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;