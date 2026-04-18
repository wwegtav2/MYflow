import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getFinanceSummary, getStudyProgress, getSettings, resetDashboardData } from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import '../styles/home.css';

function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const settings = getSettings();
  const { locale } = useLanguage();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tz = settings.clockTimezone || 'Asia/Bangkok';

  const timeStr = now.toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz
  });
  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz
  });

  return (
    <Link to="/clock" className="clock-widget card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="clock-time">{timeStr}</div>
      <div className="clock-date">{dateStr}</div>
      <div className="clock-tz">{tz}</div>
    </Link>
  );
}

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const settings = getSettings();
  const city = settings.weatherCity || 'Hat Yai';
  const unit = settings.weatherUnit || 'metric';
  const { t, lang } = useLanguage();

  useEffect(() => {
    const CACHE_KEY = `myflow_weather_cache_${lang}`;
    const cached = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; } })();

    if (cached && Date.now() - cached.ts < 30 * 60 * 1000) {
      setWeather(cached.data); setLoading(false); return;
    }

    const apiKey = settings.weatherApiKey;
    if (!apiKey) { setLoading(false); return; }

    setLoading(true);
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=${apiKey}&lang=${lang === 'th' ? 'th' : 'en'}`)
      .then(r => r.json())
      .then(data => {
        if (data.main) {
          const result = {
            temp: Math.round(data.main.temp),
            feels: Math.round(data.main.feels_like),
            desc: data.weather[0]?.description || '',
            icon: data.weather[0]?.icon || '',
            humidity: data.main.humidity,
            city: data.name
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: result }));
          setWeather(result);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [city, unit, lang]);

  if (loading) return <div className="weather-widget card"><div className="weather-loading">{t('home.loading')}</div></div>;
  if (!weather) return (
    <div className="weather-widget card">
      <div className="weather-no-key">{t('home.weatherApiKey')} <br/><Link to="/settings">{t('home.goToSettings')}</Link></div>
    </div>
  );

  return (
    <div className="weather-widget card">
      <div className="weather-city">{weather.city}</div>
      <div className="weather-main">
        {weather.icon && <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.desc} className="weather-icon" />}
        <span className="weather-temp">{weather.temp}°{unit === 'metric' ? 'C' : 'F'}</span>
      </div>
      <div className="weather-desc">{weather.desc}</div>
      <div className="weather-meta">{t('home.humidity')} {weather.humidity}% · {t('home.feelsLike')} {weather.feels}°</div>
    </div>
  );
}

function StatCard({ label, value, unit, color, to }) {
  const content = (
    <div className={`stat-card card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString()}<span className="stat-unit"> {unit}</span></div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function StudyCard({ progress }) {
  const color = progress.percent >= 80 ? 'var(--green)' : progress.percent >= 50 ? 'var(--amber)' : 'var(--red)';
  const { t } = useLanguage();
  return (
    <Link to="/study" style={{ textDecoration: 'none' }}>
      <div className="stat-card card study">
        <div className="stat-label">{t('home.studyProgress')}</div>
        <div className="study-progress-row">
          <div className="stat-value">{progress.percent}<span className="stat-unit">%</span></div>
          <div className="study-meta">{progress.done}/{progress.total} {t('home.tasks')}</div>
        </div>
        <div className="study-mini-bar">
          <div className="study-mini-fill" style={{ width: `${progress.percent}%`, background: color }} />
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [finance, setFinance] = useState({ todayExpense: 0, todayIncome: 0, totalExpense: 0, totalIncome: 0, netToday: 0, totalNet: 0 });
  const [study, setStudy] = useState({ percent: 0, done: 0, total: 0, topicCount: 0 });
  const location = useLocation();
  const { t } = useLanguage();

  const refreshData = useCallback(() => {
    setFinance(getFinanceSummary());
    setStudy(getStudyProgress());
  }, []);

  const handleReset = () => {
    if (!window.confirm(t('home.confirmReset'))) return;
    resetDashboardData();
    refreshData();
  };

  // Refresh on mount + route change
  useEffect(() => {
    refreshData();
  }, [refreshData, location.key]);

  // Refresh when tab regains focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshData]);

  return (
    <div className="home-page fade-in">
      <div className="home-top-row">
        <ClockWidget />
        <WeatherWidget />
      </div>

      <div className="home-section-header">
        <h2 className="section-title">{t('home.todaySummary')}</h2>
        <button className="reset-btn" onClick={handleReset}>{t('home.resetData')}</button>
      </div>
      <div className="grid-4">
        <StatCard label={t('home.incomeToday')}  value={finance.todayIncome}  unit={t('home.baht')} color="saving"  to="/finance" />
        <StatCard label={t('home.expenseToday')}  value={finance.todayExpense} unit={t('home.baht')} color="expense" to="/finance" />
        <StatCard label={t('home.netToday')}   value={finance.netToday}     unit={t('home.baht')} color="total"   to="/finance" />
        <StudyCard progress={study} />
      </div>

      <div className="home-quick-actions">
        <h2 className="section-title">{t('home.quickRecord')}</h2>
        <div className="quick-links">
          <Link to="/finance" className="quick-link-card">
            <span>💸</span><span>{t('home.recordExpense')}</span>
          </Link>
          <Link to="/finance?tab=income" className="quick-link-card saving">
            <span>📥</span><span>{t('home.recordIncome')}</span>
          </Link>
          <Link to="/study" className="quick-link-card study">
            <span>⏱</span><span>{t('home.startStudyTimer')}</span>
          </Link>
          <Link to="/calendar" className="quick-link-card cal">
            <span>📅</span><span>{t('home.addActivity')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}