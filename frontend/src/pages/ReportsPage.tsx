import React from 'react';

const ReportsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Financial Statements</h3>
          <p className="text-gray-600 mb-4">Generate balance sheets, income statements, and cash flow reports.</p>
          <button className="btn btn-primary">Create Report</button>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Tax Reports</h3>
          <p className="text-gray-600 mb-4">Generate VAT reports (momsdeklaration) and other tax documents.</p>
          <button className="btn btn-primary">Generate Tax Report</button>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Payroll Reports</h3>
          <p className="text-gray-600 mb-4">View payroll summaries and employee compensation reports.</p>
          <button className="btn btn-primary">View Payroll Reports</button>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
          <p className="text-gray-600 mb-4">View customizable dashboards with key performance indicators.</p>
          <button className="btn btn-primary">View Dashboard</button>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Audit Logs</h3>
          <p className="text-gray-600 mb-4">Review system activity and user actions for compliance.</p>
          <button className="btn btn-primary">View Audit Logs</button>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-semibold mb-2">Custom Reports</h3>
          <p className="text-gray-600 mb-4">Create custom reports based on your specific needs.</p>
          <button className="btn btn-primary">Create Custom Report</button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;