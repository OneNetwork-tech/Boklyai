import React from 'react';

const BankAccountsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bank Accounts</h1>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Your Bank Accounts</h2>
        <p className="text-gray-600">Connect your bank accounts to automatically import transactions.</p>
        <div className="mt-4">
          <button className="btn btn-primary">Connect Bank Account</button>
        </div>
      </div>
    </div>
  );
};

export default BankAccountsPage;