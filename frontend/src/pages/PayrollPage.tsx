import React from 'react';

const PayrollPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Payroll</h1>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Employee Payroll</h2>
        <p className="text-gray-600">Manage employee payroll and salary payments.</p>
        <div className="mt-4">
          <button className="btn btn-primary mr-2">Create Payroll</button>
          <button className="btn btn-secondary">Manage Employees</button>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;