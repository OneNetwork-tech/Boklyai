import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-blue-600 text-white font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">
                B
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">BoklyAI</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            <Link 
              to="/dashboard" 
              className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('dashboard')}
            </Link>
            <Link 
              to="/invoices" 
              className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('invoices')}
            </Link>
            <Link 
              to="/bills" 
              className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('expenses')}
            </Link>
            <Link 
              to="/reports" 
              className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('reports')}
            </Link>
            <Link 
              to="/payroll" 
              className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('payroll')}
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <Link 
              to="/login" 
              className="hidden md:inline-block text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
            >
              {t('login')}
            </Link>
            <Link 
              to="/register" 
              className="hidden md:inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300"
            >
              {t('register')}
            </Link>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden text-gray-700 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/dashboard" 
                className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('dashboard')}
              </Link>
              <Link 
                to="/invoices" 
                className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('invoices')}
              </Link>
              <Link 
                to="/bills" 
                className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('expenses')}
              </Link>
              <Link 
                to="/reports" 
                className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('reports')}
              </Link>
              <Link 
                to="/payroll" 
                className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('payroll')}
              </Link>
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              <div className="flex space-x-3 px-3">
                <Link 
                  to="/login" 
                  className="flex-1 text-center text-gray-700 hover:text-blue-600 font-medium px-3 py-2 rounded-md text-sm transition duration-300 border border-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('login')}
                </Link>
                <Link 
                  to="/register" 
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('register')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;