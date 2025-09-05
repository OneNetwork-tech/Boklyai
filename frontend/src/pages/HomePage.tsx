import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      "welcome_to_boklyai": "Welcome to BoklyAI",
      "ai_powered_accounting": "AI-powered Swedish Accounting System",
      "get_started": "Get Started Free",
      "login": "Sign In",
      "powerfull_features": "Powerful Features",
      "features_description": "Everything you need to manage your Swedish business finances efficiently",
      "bank_integration": "Bank Integration",
      "bank_integration_desc": "Automatically import and reconcile bank transactions with your accounting records.",
      "ai_document_processing": "AI Document Processing",
      "ai_document_processing_desc": "Extract data from invoices, receipts, and other financial documents using OCR and AI.",
      "tax_compliance": "Tax Compliance",
      "tax_compliance_desc": "Generate VAT reports (momsdeklaration) and stay compliant with Swedish tax regulations.",
      "invoicing_payments": "Invoicing & Payments",
      "invoicing_payments_desc": "Create and send invoices, track payments, and manage accounts receivable.",
      "payroll_management": "Payroll Management",
      "payroll_management_desc": "Manage employee payroll with automatic tax calculations and reporting.",
      "financial_reporting": "Financial Reporting",
      "financial_reporting_desc": "Generate financial statements and track key performance indicators.",
      "businesses_served": "Businesses Served",
      "uptime": "Uptime",
      "support": "Support",
      "average_setup": "Average Setup",
      "ready_to_transform": "Ready to Transform Your Accounting?",
      "join_businesses": "Join thousands of Swedish businesses already using BoklyAI to simplify their accounting processes.",
      "start_free_trial": "Start Your Free Trial"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Features data
  const features = [
    {
      title: "Bank Integration",
      description: "Automatically import and reconcile bank transactions with your accounting records.",
      icon: "🏦"
    },
    {
      title: "AI Document Processing",
      description: "Extract data from invoices, receipts, and other financial documents using OCR and AI.",
      icon: "📄"
    },
    {
      title: "Tax Compliance",
      description: "Generate VAT reports (momsdeklaration) and stay compliant with Swedish tax regulations.",
      icon: "📋"
    },
    {
      title: "Invoicing & Payments",
      description: "Create and send invoices, track payments, and manage accounts receivable.",
      icon: "🧾"
    },
    {
      title: "Payroll Management",
      description: "Manage employee payroll with automatic tax calculations and reporting.",
      icon: "👥"
    },
    {
      title: "Financial Reporting",
      description: "Generate financial statements and track key performance indicators.",
      icon: "📊"
    }
  ];

  // Stats data
  const stats = [
    { value: "1000+", label: "Businesses Served" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
    { value: "15min", label: "Average Setup" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t("welcome_to_boklyai")}
            </h1>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
              {t("ai_powered_accounting")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                to="/register" 
                className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg text-lg transition duration-300 transform hover:scale-105"
              >
                {t("get_started")}
              </Link>
              <Link 
                to="/login" 
                className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("powerfull_features")}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t("features_description")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("ready_to_transform")}
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto">
            {t("join_businesses")}
          </p>
          <Link 
            to="/register" 
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg text-lg transition duration-300 inline-block"
          >
            {t("start_free_trial")}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">BoklyAI</h3>
              <p className="text-gray-400">
                AI-powered accounting for Swedish businesses.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} BoklyAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;