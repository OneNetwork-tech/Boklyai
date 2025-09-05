import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import Header from './components/Header';
import HomePage from './pages/HomePage';

function App() {
  const { t } = useTranslation();

  return (
    <Router>
      <div className="App">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Other routes will be added here */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;