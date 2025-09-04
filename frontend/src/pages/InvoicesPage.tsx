import React from 'react';

const InvoicesPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Invoices</h1>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Customer Invoices</h2>
        <p className="text-gray-600">Create and manage invoices for your customers.</p>
        <div className="mt-4">
          <button className="btn btn-primary">Create New Invoice</button>
        </div>
      </div>
    </div>
  );
};

export default InvoicesPage;