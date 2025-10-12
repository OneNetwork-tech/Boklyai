import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          {t('welcome_to_boklyai')}
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          {t('your_ai_powered_accounting_solution')}
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link 
            to="/register" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('get_started')}
          </Link>
          
          <Link 
            to="/login" 
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('login')}
          </Link>
        </div>
      </div>
      
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('financial_reports')}</h3>
          <p className="text-gray-600">{t('generate_detailed_financial_reports')}</p>
        </div>
        
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('ai_powered')}</h3>
          <p className="text-gray-600">{t('smart_automation_for_your_books')}</p>
        </div>
        
        <div className="text-center">
          <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💼</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('business_management')}</h3>
          <p className="text-gray-600">{t('complete_business_solution')}</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;