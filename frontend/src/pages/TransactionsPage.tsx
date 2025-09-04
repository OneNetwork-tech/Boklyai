import React from 'react';

const TransactionsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Transactions</h1>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
        <p className="text-gray-600">View and manage your financial transactions.</p>
        <div className="mt-4">
          <button className="btn btn-primary mr-2">Import Transactions</button>
          <button className="btn btn-secondary">Add Manual Transaction</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;