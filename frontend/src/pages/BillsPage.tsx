import React from 'react';

const BillsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bills</h1>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Vendor Bills</h2>
        <p className="text-gray-600">Create and manage bills from your vendors.</p>
        <div className="mt-4">
          <button className="btn btn-primary">Create New Bill</button>
        </div>
      </div>
    </div>
  );
};

export default BillsPage;