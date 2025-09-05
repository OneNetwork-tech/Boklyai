import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import React from 'react';
import { useTranslation } from 'react-i18next';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('financial_overview')}</h1>
        <p className="text-gray-600">{t('dashboard_description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('revenue')}</h3>
          <p className="text-3xl font-bold text-green-600">125 000 kr</p>
          <p className="text-sm text-gray-500 mt-1">{t('this_month')}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('expenses')}</h3>
          <p className="text-3xl font-bold text-red-600">42 500 kr</p>
          <p className="text-sm text-gray-500 mt-1">{t('this_month')}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('net_income')}</h3>
          <p className="text-3xl font-bold text-blue-600">82 500 kr</p>
          <p className="text-sm text-gray-500 mt-1">{t('this_month')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('recent_transactions')}</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium text-gray-900">Kund {item}</p>
                  <p className="text-sm text-gray-500">2023-09-0{item}</p>
                </div>
                <p className="font-medium text-green-600">+{item * 15000} kr</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('upcoming_invoices')}</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-medium text-gray-900">Faktura #{100 + item}</p>
                  <p className="text-sm text-gray-500">Förfaller 2023-09-1{item}</p>
                </div>
                <p className="font-medium text-gray-900">{item * 12000} kr</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;