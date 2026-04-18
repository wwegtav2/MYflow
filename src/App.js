import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/global.css';
import './styles/langToggle.css';

import TitleBar   from './components/TitleBar';
import Sidebar    from './components/Sidebar';
import { ToastProvider } from './components/Toast';

import Home       from './pages/Home';
import Clock      from './pages/Clock';
import Finance    from './pages/Finance';
import Study      from './pages/Study';
import Calendar   from './components/Calendar';
import Settings   from './components/Settings';

import { getSettings, getEvents } from './utils/storage';
import { initNotifications }       from './utils/notifications';
import { LanguageProvider, useLanguage } from './utils/i18n';

function LangToggle() {
  const { t, toggleLang } = useLanguage();
  return (
    <button className="lang-toggle" onClick={toggleLang}>
      {t('lang.toggle')}
    </button>
  );
}

export default function App() {
  const [settings, setSettings] = useState(getSettings());

  // Apply theme & settings on mount / change
  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--accent', s.primaryColor);
    document.documentElement.style.setProperty('--font-main', `'${s.font}', sans-serif`);
  }, []);

  // Init notifications once
  useEffect(() => {
    initNotifications(getEvents);
  }, []);

  // Update sidebar clock every second
  useEffect(() => {
    const tick = setInterval(() => {
      const el = document.getElementById('sidebar-clock');
      if (el) {
        const lang = localStorage.getItem('myflow_language') || 'th';
        const loc = lang === 'th' ? 'th-TH' : 'en-US';
        el.textContent = new Date().toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <LanguageProvider>
    <ToastProvider>
    <BrowserRouter>
      <div className="app-layout">
        <TitleBar />

        <div className="app-body">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"         element={<Home />}       />
              <Route path="/clock"    element={<Clock />}      />
              <Route path="/finance"  element={<Finance />}    />
              <Route path="/study"    element={<Study />}      />
              <Route path="/calendar" element={<Calendar />}   />
              <Route path="/settings" element={<Settings onSettingsChange={setSettings} />} />
            </Routes>
          </main>
        </div>
        <LangToggle />
      </div>
    </BrowserRouter>
    </ToastProvider>
    </LanguageProvider>
  );
}