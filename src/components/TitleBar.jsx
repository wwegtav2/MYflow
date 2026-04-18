import React from 'react';
import { useLanguage } from '../utils/i18n';
import '../styles/titleBar.css';

export default function TitleBar() {
  const isElectron = !!window.electronAPI;
  const { t } = useLanguage();

  if (!isElectron) return null;

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-logo">⟡</span>
        <span className="titlebar-name">MyFlow</span>
      </div>
      <div className="titlebar-controls">
        <button onClick={() => window.electronAPI.minimize()} className="tb-btn min" title={t('titlebar.minimize')}>─</button>
        <button onClick={() => window.electronAPI.maximize()} className="tb-btn max" title={t('titlebar.maximize')}>□</button>
        <button onClick={() => window.electronAPI.close()}    className="tb-btn cls" title={t('titlebar.close')}>✕</button>
      </div>
    </div>
  );
}