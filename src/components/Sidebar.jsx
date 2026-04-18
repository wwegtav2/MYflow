import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../utils/i18n';
import '../styles/sidebar.css';

export default function Sidebar() {
  const location = useLocation();
  const { t, locale } = useLanguage();

  const NAV_ITEMS = [
    { to: '/',          icon: '⊞', label: t('nav.home')    },
    { to: '/finance',   icon: '💰', label: t('nav.finance')  },
    { to: '/study',     icon: '📚', label: t('nav.study')    },
    { to: '/calendar',  icon: '📅', label: t('nav.calendar') },
    { to: '/settings',  icon: '⚙',  label: t('nav.settings') },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">⟡</span>
        <span className="logo-text">MyFlow</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-time" id="sidebar-clock">
          {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="sidebar-date">
          {new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>
    </aside>
  );
}