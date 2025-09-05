import React from 'react';
import { useTranslation } from 'react-i18next';

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('financial_reports')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('profit_loss')}</h2>
          <p className="text-gray-600 mb-4">{t('profit_loss_description')}</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            {t('view_report')}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('balance_sheet')}</h2>
          <p className="text-gray-600 mb-4">{t('balance_sheet_description')}</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            {t('view_report')}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('cash_flow')}</h2>
          <p className="text-gray-600 mb-4">{t('cash_flow_description')}</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            {t('view_report')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;