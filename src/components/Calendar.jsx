import React, { useState, useEffect, useCallback } from 'react';
import { getEvents, addEvent, deleteEvent } from '../utils/storage';
import { scheduleCustomNotification } from '../utils/notifications';
import { useLanguage } from '../utils/i18n';
import { useToast } from './Toast';
import '../styles/calendar.css';

// ─── Helpers ─────────────────────────────────────────────────
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const TIME_PRESETS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'
];

const EVENT_TYPE_KEYS = [
  { key: 'general',  icon: '📌' },
  { key: 'meeting',  icon: '🤝' },
  { key: 'study',    icon: '📚' },
  { key: 'exercise', icon: '🏃' },
  { key: 'deadline', icon: '🔥' },
  { key: 'personal', icon: '🎉' },
  { key: 'travel',   icon: '✈️' },
  { key: 'health',   icon: '🏥' },
];

function useEventTypes() {
  const { t } = useLanguage();
  return EVENT_TYPE_KEYS.map(e => ({ ...e, label: t(`cal.eventTypes.${e.key}`) }));
}

// ─── Month/Year Picker ────────────────────────────────────────
function MonthYearPicker({ year, month, onSelect, onClose }) {
  const [view, setView] = useState('month'); // 'month' or 'year'
  const [pickerYear, setPickerYear] = useState(year);
  const { t, lang } = useLanguage();
  const MONTHS = t('cal.months');

  const years = [];
  for (let y = pickerYear - 4; y <= pickerYear + 4; y++) years.push(y);

  const displayYear = (y) => lang === 'th' ? y + 543 : y;

  return (
    <div className="my-picker-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="my-picker">
        {view === 'month' ? (
          <>
            <div className="my-picker-header">
              <button className="btn" onClick={() => setPickerYear(y => y - 1)}>‹</button>
              <span className="my-picker-year" onClick={() => setView('year')}>{displayYear(pickerYear)}</span>
              <button className="btn" onClick={() => setPickerYear(y => y + 1)}>›</button>
            </div>
            <div className="my-picker-grid">
              {MONTHS.map((m, i) => (
                <button
                  key={i}
                  className={`my-picker-btn ${i === month && pickerYear === year ? 'active' : ''}`}
                  onClick={() => { onSelect(pickerYear, i); onClose(); }}
                >
                  {m.slice(0, 3)}{lang === 'th' ? '.' : ''}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="my-picker-header">
              <button className="btn" onClick={() => setPickerYear(y => y - 9)}>‹</button>
              <span className="my-picker-year">{displayYear(years[0])} – {displayYear(years[years.length - 1])}</span>
              <button className="btn" onClick={() => setPickerYear(y => y + 9)}>›</button>
            </div>
            <div className="my-picker-grid year-grid">
              {years.map(y => (
                <button
                  key={y}
                  className={`my-picker-btn ${y === year ? 'active' : ''}`}
                  onClick={() => { setPickerYear(y); setView('month'); }}
                >
                  {displayYear(y)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Mini Calendar Grid with Day Popup ────────────────────────
function CalendarGrid({ year, month, events, selectedDate, onSelectDate, onDeleteEvent }) {
  const days      = daysInMonth(year, month);
  const firstDay  = firstDayOfMonth(year, month);
  const today     = new Date().toISOString().slice(0, 10);
  const [popupDate, setPopupDate] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const { t, locale, lang } = useLanguage();
  const EVENT_TYPES = useEventTypes();
  const MONTHS = t('cal.months');
  const DAYS = t('cal.days');

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const hasEvent = (d) => events.some(e => e.date === dateStr(d));
  const dayEvents = (d) => events.filter(e => e.date === dateStr(d)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const getIcon = (type) => {
    const found = EVENT_TYPES.find(t => t.key === type);
    return found ? found.icon : '📌';
  };

  const handleDayClick = (d) => {
    const ds = dateStr(d);
    onSelectDate(ds);
  };

  const handleEventClick = (d) => {
    const ds = dateStr(d);
    onSelectDate(ds);
    setPopupDate(ds);
    setDeleteMode(false);
    setSelected([]);
  };

  const closePopup = () => {
    setPopupDate(null);
    setDeleteMode(false);
    setSelected([]);
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleDeleteSelected = () => {
    selected.forEach(id => onDeleteEvent(id));
    setSelected([]);
    setDeleteMode(false);
  };

  const handleDeleteAll = () => {
    popupEvents.forEach(ev => onDeleteEvent(ev.id));
    closePopup();
  };

  const popupEvents = popupDate
    ? events.filter(e => e.date === popupDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    : [];

  const popupLabel = (() => {
    if (!popupDate) return '';
    if (popupDate === today) return t('cal.today');
    const d = new Date(popupDate);
    return '📅 ' + d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const displayYear = lang === 'th' ? year + 543 : year;

  // Close popup on Escape key
  useEffect(() => {
    if (!popupDate) return;
    const handleKey = (e) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [popupDate]);

  return (
    <div className="cal-grid-wrap card">
      <div className="cal-header">
        <span className="cal-month-label">{MONTHS[month]} {displayYear}</span>
      </div>
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {cells.map((d, i) => (
          <div
            key={i}
            className={[
              'cal-cell',
              d ? 'has-day' : '',
              d && dateStr(d) === today ? 'today' : '',
              d && dateStr(d) === selectedDate ? 'selected' : '',
              d && hasEvent(d) ? 'has-event' : ''
            ].join(' ')}
            onClick={() => d && handleDayClick(d)}
          >
            <span className="cal-cell-number">{d || ''}</span>
            {d && hasEvent(d) && (
              <div className="cal-cell-events">
                {dayEvents(d).slice(0, 3).map(ev => (
                  <div key={ev.id} className="cal-event-bar" title={ev.title} onClick={(e) => { e.stopPropagation(); handleEventClick(d); }}>
                    <span className="cal-event-bar-icon">{getIcon(ev.type)}</span>
                    <span className="cal-event-bar-title">{ev.title}</span>
                  </div>
                ))}
                {dayEvents(d).length > 3 && (
                  <div className="cal-event-more" onClick={(e) => { e.stopPropagation(); handleEventClick(d); }}>+{dayEvents(d).length - 3}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Day popup */}
      {popupDate && (
        <div className="day-popup-inline" onMouseDown={(e) => { if (e.target === e.currentTarget) closePopup(); }}>
        <div className="day-popup">
          <div className="day-popup-header">
            <span>{popupLabel}</span>
            <div className="day-popup-actions">
              {popupEvents.length > 0 && (
                <button
                  className={`day-popup-del-toggle ${deleteMode ? 'active' : ''}`}
                  onClick={() => { setDeleteMode(!deleteMode); setSelected([]); }}
                  title={t('cal.deleteEvent')}
                >🗑️</button>
              )}
              <button className="day-popup-close" onClick={closePopup}>✕</button>
            </div>
          </div>
          {popupEvents.length === 0 ? (
            <div className="day-popup-empty">{t('cal.noEvents')}</div>
          ) : (
            <div className="day-popup-list">
              {popupEvents.map(ev => (
                <div key={ev.id} className={`day-popup-item ${deleteMode && selected.includes(ev.id) ? 'selected' : ''}`}
                     onClick={() => deleteMode && toggleSelect(ev.id)}>
                  {deleteMode && (
                    <span className="day-popup-checkbox">{selected.includes(ev.id) ? '☑' : '☐'}</span>
                  )}
                  <span className="day-popup-icon">{getIcon(ev.type)}</span>
                  <span className="day-popup-time">{ev.time || '—'}</span>
                  <div className="day-popup-body">
                    <div className="day-popup-title">{ev.title}</div>
                    {ev.note && <div className="day-popup-note">{ev.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {deleteMode && popupEvents.length > 0 && (
            <div className="day-popup-footer">
              <button className="btn danger" onClick={handleDeleteAll}>{t('cal.deleteAll')}</button>
              <button className="btn danger" onClick={handleDeleteSelected} disabled={selected.length === 0}>
                {t('cal.deleteSelected')} ({selected.length})
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline for selected date ───────────────────────────────
function DayTimeline({ date, events, onDelete }) {
  const { t, locale } = useLanguage();
  const EVENT_TYPES = useEventTypes();
  const dayEvents = events
    .filter(e => e.date === date)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const label = (() => {
    const today = new Date().toISOString().slice(0, 10);
    if (date === today) return t('cal.today');
    const d = new Date(date);
    return '📅 ' + d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  const getIcon = (type) => {
    const found = EVENT_TYPES.find(t => t.key === type);
    return found ? found.icon : '📌';
  };

  return (
    <div className="timeline-wrap card">
      <div className="timeline-header">{label}</div>
      {dayEvents.length === 0
        ? <div className="empty-state">{t('cal.noEventsToday')}</div>
        : (
          <div className="timeline">
            {dayEvents.map(ev => (
              <div key={ev.id} className="timeline-item">
                <div className="tl-time">{ev.time || '—'}</div>
                <div className="tl-icon">{getIcon(ev.type)}</div>
                <div className="tl-body">
                  <div className="tl-title">{ev.title}</div>
                  {ev.note && <div className="tl-note">{ev.note}</div>}
                </div>
                <button className="btn danger tl-del" onClick={() => onDelete(ev.id)}>✕</button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── Add event form ───────────────────────────────────────────
function AddEventForm({ defaultDate, onAdd }) {
  const [form, setForm] = useState({ title: '', date: defaultDate, time: '', note: '', notify: false, type: 'general' });
  const { t } = useLanguage();
  const { showToast } = useToast();
  const EVENT_TYPES = useEventTypes();

  useEffect(() => {
    setForm(f => ({ ...f, date: defaultDate }));
  }, [defaultDate]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = () => {
    if (!form.title.trim() || !form.date) return;
    const ev = { title: form.title.trim(), date: form.date, time: form.time, note: form.note, type: form.type };
    addEvent(ev);
    if (form.notify && form.time) {
      scheduleCustomNotification(form.time, `📅 ${form.title}`);
    }
    onAdd();
    setForm(f => ({ ...f, title: '', time: '', note: '', notify: false, type: 'general' }));
    showToast(t('toast.eventAdded'), 'success');
  };

  return (
    <div className="add-event-form card">
      <h3 className="section-h3">{t('cal.addEvent')}</h3>
      <div className="form-group">
        <label>{t('cal.eventType')}</label>
        <div className="event-type-grid">
          {EVENT_TYPES.map(t => (
            <button
              key={t.key}
              className={`event-type-btn ${form.type === t.key ? 'active' : ''}`}
              onClick={() => set('type', t.key)}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>{t('cal.eventName')}</label>
        <input placeholder={t('cal.eventNamePlaceholder')} value={form.title} onChange={e => set('title', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('cal.date')}</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="form-group">
          <label>{t('cal.time')}</label>
          <input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>{t('cal.quickTime')}</label>
        <div className="time-preset-grid">
          {TIME_PRESETS.map(t => (
            <button
              key={t}
              className={`time-preset-btn ${form.time === t ? 'active' : ''}`}
              onClick={() => set('time', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>{t('cal.note')}</label>
        <input placeholder={t('cal.notePlaceholder')} value={form.note} onChange={e => set('note', e.target.value)} />
      </div>
      <div className="form-check">
        <input type="checkbox" id="notify-cb" checked={form.notify} onChange={e => set('notify', e.target.checked)} style={{ width: 'auto' }} />
        <label htmlFor="notify-cb" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          {t('cal.notify')}
        </label>
      </div>
      <button className="btn primary" onClick={handleSubmit} style={{ marginTop: '0.5rem' }}>
        {t('cal.addEventBtn')}
      </button>
    </div>
  );
}

// ─── All upcoming events ──────────────────────────────────────
function UpcomingEvents({ events, onDelete }) {
  const today = new Date().toISOString().slice(0, 10);
  const { t } = useLanguage();
  const EVENT_TYPES = useEventTypes();
  const upcoming = events
    .filter(e => e.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 10);

  const getIcon = (type) => {
    const found = EVENT_TYPES.find(t => t.key === type);
    return found ? found.icon : '📌';
  };

  if (upcoming.length === 0) return null;

  return (
    <div className="upcoming-wrap card">
      <h3 className="section-h3">{t('cal.upcoming')}</h3>
      <div className="upcoming-list">
        {upcoming.map(ev => (
        <div key={ev.id} className="upcoming-item">
          <div className="upcoming-icon">{getIcon(ev.type)}</div>
          <div className="upcoming-date">{ev.date === today ? t('finance.today') : ev.date}</div>
          <div className="upcoming-time">{ev.time || '—'}</div>
          <div className="upcoming-title">{ev.title}</div>
          <button className="btn danger tl-del" onClick={() => onDelete(ev.id)}>✕</button>
        </div>
      ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function Calendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [events, setEvents] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const MONTHS = t('cal.months');

  const refresh = useCallback(() => setEvents(getEvents()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleDelete = (id) => { deleteEvent(id); refresh(); showToast(t('toast.eventDeleted'), 'success'); };

  const displayYear = lang === 'th' ? year + 543 : year;

  return (
    <div className="calendar-page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">{t('cal.title')}</div>
          <div className="page-subtitle">{t('cal.subtitle')}</div>
        </div>
        <div className="month-nav">
          <button className="btn" onClick={prevMonth}>‹</button>
          <span className="month-nav-label clickable" onClick={() => setShowPicker(true)}>
            {MONTHS[month]} {displayYear}
          </span>
          <button className="btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      {showPicker && (
        <MonthYearPicker
          year={year}
          month={month}
          onSelect={(y, m) => { setYear(y); setMonth(m); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="cal-layout">
        <div className="cal-left">
          <CalendarGrid year={year} month={month} events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} onDeleteEvent={handleDelete} />
        </div>
        <div className="cal-right">
          <AddEventForm defaultDate={selectedDate} onAdd={refresh} />
        </div>
      </div>
    </div>
  );
}