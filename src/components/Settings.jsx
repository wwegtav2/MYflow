import React, { useState } from 'react';
import { getSettings, saveSettings, storage, saveBackgroundFile, getBackgroundFile, clearBackgroundFile } from '../utils/storage';
import { scheduleCustomNotification, clearAllScheduled } from '../utils/notifications';
import { useLanguage } from '../utils/i18n';
import { useToast } from './Toast';
import '../styles/settings.css';

const FONTS   = ['Sarabun', 'Prompt', 'Kanit', 'Mitr', 'Anuphan'];
const COLORS  = ['#7c6fff','#60a5fa','#4ade80','#f472b6','#fb923c','#f87171','#2dd4bf','#facc15'];
const TIMEZONES = ['Asia/Bangkok','Asia/Tokyo','Asia/Singapore','Europe/London','America/New_York','America/Los_Angeles'];
const CLOCK_COLORS = ['#7c6fff','#60a5fa','#4ade80','#f472b6','#fb923c','#f87171','#2dd4bf','#facc15','#ffffff','#e2e8f0'];
const BG_COLORS = ['#0d0d1a','#1a1a2e','#16213e','#0f3460','#1b1b2f','#2d132c','#1a0000','#0a192f','#162447','#1f4068','#222222','#111827'];

function Section({ title, children }) {
  return (
    <div className="settings-section card">
      <h3 className="settings-section-title">{title}</h3>
      <div className="settings-body">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">
        <span>{label}</span>
        {hint && <span className="settings-hint">{hint}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

export default function Settings({ onSettingsChange }) {
  const [s, setS]       = useState(getSettings());
  const [saved, setSaved] = useState(false);
  const [notifyTime, setNotifyTime] = useState('20:00');
  const [notifyMsg,  setNotifyMsg]  = useState('');
  const [bgFile, setBgFile] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [testingWeather, setTestingWeather] = useState(false);
  const [weatherTestResult, setWeatherTestResult] = useState(null);
  const { t } = useLanguage();
  const { showToast } = useToast();

  const update = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  const handleTestWeather = async () => {
    if (!s.weatherApiKey) {
      setWeatherTestResult({ type: 'error', message: t('settings.pleaseEnterApiKey') });
      return;
    }
    
    if (!s.weatherCity) {
      setWeatherTestResult({ type: 'error', message: t('settings.pleaseEnterCity') });
      return;
    }
    
    setTestingWeather(true);
    setWeatherTestResult(null);
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${s.weatherCity}&units=${s.weatherUnit === 'metric' ? 'metric' : 'imperial'}&appid=${s.weatherApiKey}&lang=th`
      );

      if (response.ok) {
        const data = await response.json();
        setWeatherTestResult({ 
          type: 'success', 
          message: `${t('settings.connSuccess')} ${data.name}: ${data.main.temp}°${s.weatherUnit === 'metric' ? 'C' : 'F'}` 
        });
      } else if (response.status === 401) {
        setWeatherTestResult({ type: 'error', message: t('settings.invalidApiKey') });
      } else if (response.status === 404) {
        setWeatherTestResult({ type: 'error', message: t('settings.cityNotFound') });
      } else {
        setWeatherTestResult({ type: 'error', message: `${t('settings.error')} (${response.status})` });
      }
    } catch (err) {
      setWeatherTestResult({ type: 'error', message: t('settings.connFailed') + err.message });
    }
    
    setTestingWeather(false);
  };

  const handleSave = () => {
    // ไม่เก็บ backgroundUrl ใน settings (เก็บแยกเพื่อไม่ให้เกิน localStorage quota)
    const settingsToSave = { ...s };
    if (settingsToSave.backgroundUrl && settingsToSave.backgroundUrl.startsWith('data:')) {
      settingsToSave.backgroundUrl = '__bgFile__'; // marker ให้รู้ว่าเก็บแยก
    }
    const ok = saveSettings(settingsToSave);
    if (!ok) {
      setSaveError(t('settings.saveFailed'));
      setTimeout(() => setSaveError(null), 4000);
      return;
    }
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--accent', s.primaryColor);
    document.documentElement.style.setProperty('--font-main', `'${s.font}', sans-serif`);
    onSettingsChange?.(s);
    setSaveError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    showToast(t('toast.settingsSaved'), 'success');
  };

  const handleBgFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const type = file.type.startsWith('video') ? 'video' : 'image';
      // เก็บไฟล์แยกจาก settings เพื่อไม่ให้เกิน localStorage quota
      const ok = saveBackgroundFile(dataUrl);
      if (!ok) {
        setSaveError(t('settings.fileTooBig'));
        setTimeout(() => setSaveError(null), 4000);
        return;
      }
      update('backgroundType', type);
      update('backgroundUrl', dataUrl);
      setBgFile(file.name);
      setSaveError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearBg = () => {
    update('backgroundUrl', '');
    clearBackgroundFile();
    setBgFile(null);
  };

  const handleAddNotify = () => {
    if (!notifyTime) return;
    scheduleCustomNotification(notifyTime, notifyMsg || `${t('settings.notifySet')} ${notifyTime}`);
    setNotifyMsg('');
    alert(`${t('settings.notifySet')} ${notifyTime} ${t('settings.notifySetDone')}`);
  };

  const handleClearData = () => {
    if (window.confirm(t('settings.confirmClear'))) {
      storage.clear();
      showToast(t('toast.dataCleared'), 'success');
    }
  };

  return (
    <div className="settings-page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">{t('settings.title')}</div>
          <div className="page-subtitle">{t('settings.subtitle')}</div>
        </div>
        <button className={`btn primary ${saved ? 'saved' : ''}`} onClick={handleSave}>
          {saved ? t('settings.saved') : t('settings.save')}
        </button>
        {saveError && (
          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>⚠ {saveError}</span>
        )}
      </div>

      {/* ─── Appearance ─────────────────────────────────────── */}
      <Section title={t('settings.themeStyle')}>
        <Row label={t('settings.colorMode')} hint="Dark / Light">
          <div className="toggle-group">
            {['dark','light'].map(th => (
              <button key={th} className={`toggle-opt ${s.theme === th ? 'active' : ''}`} onClick={() => update('theme', th)}>
                {th === 'dark' ? '🌙 Dark' : '☀ Light'}
              </button>
            ))}
          </div>
        </Row>

        <Row label={t('settings.primaryColor')}>
          <div className="color-swatches">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-swatch ${s.primaryColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => update('primaryColor', c)}
              />
            ))}
            <input
              type="color"
              value={s.primaryColor}
              onChange={e => update('primaryColor', e.target.value)}
              title={t('settings.customColor')}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
            />
          </div>
        </Row>

        <Row label={t('settings.font')}>
          <div className="font-options">
            {FONTS.map(f => (
              <button
                key={f}
                className={`font-opt ${s.font === f ? 'active' : ''}`}
                style={{ fontFamily: f }}
                onClick={() => update('font', f)}
              >
                {f}
              </button>
            ))}
          </div>
        </Row>

        <Row label={t('settings.animation')} hint={t('settings.animationHint')}>
          <label className="switch">
            <input type="checkbox" checked={s.animationsEnabled} onChange={e => update('animationsEnabled', e.target.checked)} />
            <span className="switch-slider" />
          </label>
        </Row>
      </Section>

      {/* ─── Background ─────────────────────────────────────── */}
      <Section title={t('settings.bgTitle')}>
        <Row label={t('settings.bgType')}>
          <div className="toggle-group">
            {['color','image','video'].map(tp => (
              <button key={tp} className={`toggle-opt ${s.backgroundType === tp ? 'active' : ''}`} onClick={() => update('backgroundType', tp)}>
                {tp === 'color' ? t('settings.bgColor') : tp === 'image' ? t('settings.bgImage') : t('settings.bgVideo')}
              </button>
            ))}
          </div>
        </Row>

        {s.backgroundType === 'color' && (
          <Row label={t('settings.bgColorLabel')} hint={t('settings.bgColorHint')}>
            <div className="color-swatches">
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${s.backgroundColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => update('backgroundColor', c)}
                />
              ))}
              <input type="color" value={s.backgroundColor || '#0d0d1a'} onChange={e => update('backgroundColor', e.target.value)}
                title={t('settings.customColor')}
                style={{ width: 32, height: 32, cursor: 'pointer', borderRadius: 8, border: '1px solid var(--border)', padding: 2 }} />
            </div>
          </Row>
        )}

        {(s.backgroundType === 'image' || s.backgroundType === 'video') && (
          <>
            <Row label={t('settings.bgFile')} hint={bgFile || t('settings.bgFileHint')}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label className="btn" style={{ cursor: 'pointer' }}>
                  {t('settings.chooseFile')}
                  <input type="file" accept="image/*,video/*" onChange={handleBgFile} style={{ display: 'none' }} />
                </label>
                {(s.backgroundUrl || getBackgroundFile()) && (
                  <button className="btn danger" onClick={handleClearBg}>{t('settings.deleteBg')}</button>
                )}
              </div>
            </Row>
            <Row label={t('settings.orUrl')} hint={t('settings.orUrlHint')}>
              <input
                value={s.backgroundUrl && !s.backgroundUrl.startsWith('data:') && s.backgroundUrl !== '__bgFile__' ? s.backgroundUrl : ''}
                onChange={e => { update('backgroundUrl', e.target.value); clearBackgroundFile(); }}
                placeholder="https://..."
              />
            </Row>
            {(() => {
              const previewUrl = s.backgroundUrl === '__bgFile__' ? getBackgroundFile()
                : s.backgroundUrl && s.backgroundUrl.startsWith('data:') ? s.backgroundUrl
                : s.backgroundUrl || '';
              if (!previewUrl) return null;
              return (
                <Row label="ตัวอย่าง">
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 200 }}>
                    {s.backgroundType === 'image' ? (
                      <img src={previewUrl} alt="preview" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <video src={previewUrl} muted autoPlay loop style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    )}
                  </div>
                </Row>
              );
            })()}
          </>
        )}
      </Section>

      {/* ─── Clock Style ────────────────────────────────────── */}
      <Section title={t('settings.clockStyle')}>
        <Row label={t('settings.bold')} hint={t('settings.boldHint')}>
          <label className="switch">
            <input type="checkbox" checked={s.clockBold ?? false} onChange={e => update('clockBold', e.target.checked)} />
            <span className="switch-slider" />
          </label>
        </Row>

        <Row label={t('settings.bgBox')} hint={t('settings.bgBoxHint')}>
          <label className="switch">
            <input type="checkbox" checked={s.clockBox ?? false} onChange={e => update('clockBox', e.target.checked)} />
            <span className="switch-slider" />
          </label>
        </Row>

        <Row label={t('settings.clockColor')}>
          <div className="color-swatches">
            {CLOCK_COLORS.map(c => (
              <button
                key={c}
                className={`color-swatch ${(s.clockColor || '#7c6fff') === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => update('clockColor', c)}
              />
            ))}
            <input
              type="color"
              value={s.clockColor || '#7c6fff'}
              onChange={e => update('clockColor', e.target.value)}
              title={t('settings.customColor')}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
            />
          </div>
        </Row>

        <Row label={t('settings.preview')}>
          <div style={{
            fontWeight: s.clockBold ? 800 : 400,
            padding: s.clockBox ? '12px 24px' : '0',
            background: s.clockBox ? 'rgba(0,0,0,0.4)' : 'transparent',
            borderRadius: s.clockBox ? '16px' : '0',
            backdropFilter: s.clockBox ? 'blur(8px)' : 'none',
            textShadow: s.clockBold ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
            textAlign: 'center',
            lineHeight: 1.6
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', color: s.clockColor || '#7c6fff', letterSpacing: '0.04em', lineHeight: 1 }}>20:59</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>Wednesday 16 April 2025</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Asia/Bangkok</div>
          </div>
        </Row>
      </Section>

      {/* ─── Clock & Weather ────────────────────────────────── */}
      <Section title={t('settings.clockWeather')}>
        <Row label="Timezone">
          <select value={s.clockTimezone} onChange={e => update('clockTimezone', e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Row>
        <Row label={t('settings.weatherCity')}>
          <input value={s.weatherCity} onChange={e => update('weatherCity', e.target.value)} placeholder={t('settings.weatherCityPlaceholder')} />
        </Row>
        <Row label={t('settings.tempUnit')}>
          <div className="toggle-group">
            <button className={`toggle-opt ${s.weatherUnit === 'metric' ? 'active' : ''}`} onClick={() => update('weatherUnit', 'metric')}>°C</button>
            <button className={`toggle-opt ${s.weatherUnit === 'imperial' ? 'active' : ''}`} onClick={() => update('weatherUnit', 'imperial')}>°F</button>
          </div>
        </Row>
        <Row label="OpenWeatherMap API Key" hint={t('settings.weatherApiKeyHint')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <input
              type="password"
              value={s.weatherApiKey || ''}
              onChange={e => update('weatherApiKey', e.target.value)}
              placeholder={t('settings.weatherApiKeyPlaceholder')}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn primary" 
                onClick={handleTestWeather}
                disabled={testingWeather || !s.weatherApiKey || !s.weatherCity}
                style={{ opacity: testingWeather || !s.weatherApiKey || !s.weatherCity ? 0.6 : 1, cursor: testingWeather || !s.weatherApiKey || !s.weatherCity ? 'not-allowed' : 'pointer' }}
              >
                {testingWeather ? t('settings.testing') : t('settings.testApi')}
              </button>
              {weatherTestResult && (
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: weatherTestResult.type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                  color: weatherTestResult.type === 'success' ? '#4ade80' : '#f87171',
                  border: weatherTestResult.type === 'success' ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(248,113,113,0.3)'
                }}>
                  {weatherTestResult.message}
                </span>
              )}
            </div>
          </div>
        </Row>
      </Section>

      {/* ─── Notifications ──────────────────────────────────── */}
      <Section title={t('settings.notifications')}>
        <Row label={t('settings.dailyBudget')} hint={t('settings.dailyBudgetHint')}>
          <input
            type="number"
            value={s.dailyBudget || 500}
            onChange={e => update('dailyBudget', Number(e.target.value))}
            min="0"
            style={{ maxWidth: 120 }}
          />
        </Row>
        <Row label={t('settings.setNotifyTime')} hint={t('settings.setNotifyHint')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="time" value={notifyTime} onChange={e => setNotifyTime(e.target.value)} style={{ maxWidth: 120 }} />
            <input placeholder={t('settings.notifyMsg')} value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} style={{ maxWidth: 200 }} />
            <button className="btn primary" onClick={handleAddNotify}>{t('study.add')}</button>
            <button className="btn" onClick={() => { clearAllScheduled(); alert(t('settings.cancelledAll')); }}>{t('settings.cancelAll')}</button>
          </div>
        </Row>
      </Section>

      {/* ─── Data ───────────────────────────────────────────── */}
      <Section title={t('settings.data')}>
        <Row label={t('settings.clearAll')} hint={t('settings.clearAllHint')}>
          <button className="btn danger" onClick={handleClearData}>{t('settings.clearBtn')}</button>
        </Row>
      </Section>
    </div>
  );
}