import React, { useState } from 'react';
import { getTransactions, getStudySummaryToday, getSettings, storage } from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import '../styles/aisummary.css';

// Build last-7-days data for analysis
function buildWeeklySummary() {
  const txs = getTransactions();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayTxs  = txs.filter(t => t.date === dateStr);

    days.push({
      date: dateStr,
      expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      saving:  dayTxs.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0),
      txCount: dayTxs.length
    });
  }

  const totalExpense = days.reduce((s, d) => s + d.expense, 0);
  const totalSaving  = days.reduce((s, d) => s + d.saving, 0);
  const avgExpense   = Math.round(totalExpense / 7);
  const maxDay       = days.reduce((a, b) => a.expense > b.expense ? a : b);

  return { days, totalExpense, totalSaving, avgExpense, maxDay };
}

function buildPrompt(data) {
  const { days, totalExpense, totalSaving, avgExpense, maxDay } = data;
  const rows = days.map(d => `- ${d.date}: ใช้จ่าย ${d.expense} บาท, เก็บออม ${d.saving} บาท`).join('\n');

  return `คุณเป็น AI ที่วิเคราะห์พฤติกรรมการเงินและชีวิตประจำวันของผู้ใช้

ข้อมูลการเงิน 7 วันที่ผ่านมา:
${rows}

สรุปรวม:
- ใช้จ่ายรวม: ${totalExpense} บาท
- เก็บออมรวม: ${totalSaving} บาท
- ใช้จ่ายเฉลี่ย/วัน: ${avgExpense} บาท
- วันที่ใช้จ่ายมากสุด: ${maxDay.date} (${maxDay.expense} บาท)

กรุณาวิเคราะห์และให้คำแนะนำแบบเป็นกันเอง เป็นภาษาไทย โดยแบ่งเป็น:
1. 📊 สรุปภาพรวม (2-3 ประโยค)
2. 💡 จุดที่ทำได้ดี
3. ⚠️ สิ่งที่ควรระวังหรือปรับปรุง
4. 🎯 คำแนะนำ 3 ข้อ สำหรับสัปดาห์หน้า

ตอบแบบกระชับ ได้ใจความ ไม่ต้องยาวเกินไป`;
}

// Gemini API call
async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่มีคำตอบ';
}

// Format Gemini markdown-like response for display
function FormattedResponse({ text }) {
  const lines = text.split('\n');
  return (
    <div className="ai-response">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (/^#{1,3}\s/.test(line)) return <h3 key={i} className="ai-h3">{line.replace(/^#+\s/, '')}</h3>;
        if (/^[1-9]\.\s/.test(line) || /^[-•]\s/.test(line)) return <li key={i} className="ai-li">{line.replace(/^[-•1-9.]\s?/, '')}</li>;
        if (/^[📊💡⚠🎯]/.test(line)) return <h3 key={i} className="ai-h3">{line}</h3>;
        return <p key={i} className="ai-p">{line}</p>;
      })}
    </div>
  );
}

// Bar chart mini component
function WeekChart({ days }) {
  const max = Math.max(...days.map(d => d.expense), 1);
  return (
    <div className="week-chart">
      {days.map(d => {
        const h = Math.max((d.expense / max) * 100, d.expense > 0 ? 4 : 0);
        const label = new Date(d.date).toLocaleDateString(locale, { weekday: 'short' });
        return (
          <div key={d.date} className="chart-col">
            <span className="chart-val">{d.expense > 0 ? d.expense.toLocaleString() : ''}</span>
            <div className="chart-bar-wrap">
              <div className="chart-bar" style={{ height: `${h}%` }} />
              {d.saving > 0 && <div className="chart-bar saving" style={{ height: `${Math.max((d.saving / max) * 100, 4)}%` }} />}
            </div>
            <span className="chart-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AISummary() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);
  const { t } = useLanguage();

  const settings = getSettings();

  const handleAnalyze = async () => {
    if (!settings.geminiApiKey) {
      setError(t('ai.noApiKeyError'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const summary = buildWeeklySummary();
      setData(summary);
      const prompt = buildPrompt(summary);
      const text   = await callGemini(settings.geminiApiKey, prompt);
      setResult(text);
    } catch (e) {
      setError(`${t('ai.error')}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const weekData = data || buildWeeklySummary();

  return (
    <div className="ai-page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">{t('ai.title')}</div>
          <div className="page-subtitle">{t('ai.subtitle')}</div>
        </div>
        <button className="btn primary" onClick={handleAnalyze} disabled={loading}>
          {loading ? t('ai.analyzing') : t('ai.analyze')}
        </button>
      </div>

      {/* Week stats */}
      <div className="ai-stats-row">
        <div className="card ai-stat">
          <div className="sum-label">{t('ai.expense7days')}</div>
          <div className="sum-val" style={{ color: 'var(--red)', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {weekData.totalExpense.toLocaleString()} ฿
          </div>
        </div>
        <div className="card ai-stat">
          <div className="sum-label">{t('ai.saving7days')}</div>
          <div className="sum-val" style={{ color: 'var(--green)', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {weekData.totalSaving.toLocaleString()} ฿
          </div>
        </div>
        <div className="card ai-stat">
          <div className="sum-label">{t('ai.avgPerDay')}</div>
          <div className="sum-val" style={{ color: 'var(--amber)', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {weekData.avgExpense.toLocaleString()} ฿
          </div>
        </div>
        <div className="card ai-stat">
          <div className="sum-label">{t('ai.netTotal')}</div>
          <div className="sum-val" style={{ color: 'var(--teal)', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {(weekData.totalSaving - weekData.totalExpense).toLocaleString()} ฿
          </div>
        </div>
      </div>

      {/* Mini chart */}
      <div className="card">
        <h3 className="section-h3" style={{ marginBottom: '1rem' }}>{t('ai.chart7days')}</h3>
        <WeekChart days={weekData.days} />
        <div className="chart-legend">
          <span><span className="legend-dot red" /> {t('ai.expenses')}</span>
          <span><span className="legend-dot green" /> {t('ai.savings')}</span>
        </div>
      </div>

      {/* No API key */}
      {!settings.geminiApiKey && (
        <div className="ai-no-key card">
          <div className="ai-no-key-icon">🤖</div>
          <div>{t('ai.noApiKey')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('ai.goToSettings')} <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ai-loading card">
          <div className="ai-spinner" />
          <div>{t('ai.loading')}</div>
        </div>
      )}

      {/* Error */}
      {error && <div className="ai-error card">{error}</div>}

      {/* Result */}
      {result && (
        <div className="ai-result card">
          <div className="ai-result-header">
            <span className="ai-result-icon">✨</span>
            <span className="ai-result-title">{t('ai.resultTitle')}</span>
            <span className="ai-result-model">Gemini 1.5 Flash</span>
          </div>
          <FormattedResponse text={result} />
        </div>
      )}
    </div>
  );
}