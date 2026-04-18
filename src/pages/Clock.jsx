import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getSettings, getBackgroundFile } from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import '../styles/clock.css';

export default function Clock() {
  const [now, setNow] = useState(new Date());
  const settings = getSettings();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

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

  // Background style for clock page only
  const bgStyle = (() => {
    const bgUrl = settings.backgroundUrl === '__bgFile__' ? getBackgroundFile() : settings.backgroundUrl;
    if (settings.backgroundType === 'image' && bgUrl) {
      return { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (settings.backgroundType === 'color' && settings.backgroundColor) {
      return { background: settings.backgroundColor };
    }
    return { background: 'var(--bg-primary)' };
  })();

  const videoBgUrl = (() => {
    if (settings.backgroundType !== 'video') return '';
    return settings.backgroundUrl === '__bgFile__' ? getBackgroundFile() : settings.backgroundUrl;
  })();

  return ReactDOM.createPortal(
    <div className="clock-page-fullscreen fade-in" style={bgStyle} onClick={() => navigate('/')}>
      {settings.backgroundType === 'video' && videoBgUrl && (
        <video
          key={videoBgUrl}
          autoPlay muted loop playsInline
          className="clock-page-video"
        >
          <source src={videoBgUrl} />
        </video>
      )}
      <div
        className="clock-page-content"
        style={{
          fontWeight: settings.clockBold ? 800 : undefined,
          textShadow: settings.clockBold ? '0 4px 24px rgba(0,0,0,0.5)' : undefined,
          padding: settings.clockBox ? '32px 56px' : undefined,
          background: settings.clockBox ? 'rgba(0,0,0,0.4)' : undefined,
          borderRadius: settings.clockBox ? '28px' : undefined,
          backdropFilter: settings.clockBox ? 'blur(10px)' : undefined
        }}
      >
        <div
          className="clock-page-time"
          style={{ color: settings.clockColor || 'var(--accent)' }}
        >
          {timeStr}
        </div>
        <div className="clock-page-date">{dateStr}</div>
        <div className="clock-page-tz">{tz}</div>
        <div className="clock-page-hint">{t('clock.clickToReturn')}</div>
      </div>
    </div>,
    document.body
  );
}
