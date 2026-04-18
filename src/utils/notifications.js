// ============================================================
// notifications.js — ระบบแจ้งเตือนทั้ง 5 ประเภท
// ============================================================

import { getTransactions, getSettings } from './storage';

async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendNotification(title, body, icon = '/icon.png') {
  // ใช้ Electron native notification ถ้ามี, fallback web
  if (window.electronAPI?.showNotification) {
    window.electronAPI.showNotification(title, body);
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  }
}

// ─── Type 1: แจ้งเตือนตอนเปิดแอป ──────────────────────────
export function notifyOnOpen() {
  const today = new Date().toISOString().slice(0, 10);
  const txs = getTransactions().filter(t => t.date === today);
  if (txs.length === 0) {
    setTimeout(() => {
      sendNotification('💰 MyFlow', 'วันนี้ยังไม่ได้บันทึกรายรับ-รายจ่ายเลยนะ!');
    }, 2000);
  }
}

// ─── Type 2: แจ้งเตือนหลังเปิดเครื่อง delay 5 นาที ────────
export function notifyAfterBoot() {
  setTimeout(() => {
    sendNotification('🌅 MyFlow', 'เริ่มวันใหม่ — อย่าลืมบันทึกค่าใช้จ่ายวันนี้ด้วยนะ!');
  }, 5 * 60 * 1000); // 5 minutes
}

// ─── Type 3: ตั้งเวลาเอง (เช่น 18:00, 20:00) ───────────────
let scheduledTimers = [];

export function scheduleCustomNotification(timeStr, message) {
  const [h, m] = timeStr.split(':').map(Number);
  const now  = new Date();
  const fire = new Date();
  fire.setHours(h, m, 0, 0);

  if (fire <= now) fire.setDate(fire.getDate() + 1); // พรุ่งนี้ถ้าผ่านไปแล้ว

  const delay = fire - now;
  const timer = setTimeout(() => {
    sendNotification('⏰ MyFlow', message || `ถึงเวลา ${timeStr} แล้ว!`);
  }, delay);

  scheduledTimers.push(timer);
  return timer;
}

export function clearAllScheduled() {
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];
}

// ─── Type 4: แจ้งเตือนจากปฏิทิน ───────────────────────────
let calendarInterval = null;

export function startCalendarReminder(getEvents) {
  if (calendarInterval) clearInterval(calendarInterval);

  calendarInterval = setInterval(() => {
    const now  = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const today = now.toISOString().slice(0, 10);

    const events = getEvents();
    events.forEach(ev => {
      if (ev.date === today && ev.time === hhmm) {
        sendNotification('📅 MyFlow — กิจกรรมวันนี้', ev.title);
      }
    });
  }, 60 * 1000); // เช็คทุก 1 นาที
}

export function stopCalendarReminder() {
  if (calendarInterval) clearInterval(calendarInterval);
}

// ─── Type 5: แจ้งเตือนพฤติกรรม ─────────────────────────────
export function checkBehaviorNotifications() {
  const { todayExpense, todaySaving } = (() => {
    const { getFinanceSummary } = require('./storage');
    return getFinanceSummary();
  })();

  const settings = getSettings();
  const budgetLimit = settings.dailyBudget || 500;

  // ยังไม่เก็บเงินวันนี้
  if (todaySaving === 0) {
    sendNotification('🏦 MyFlow', 'วันนี้ยังไม่ได้เก็บเงินเลยนะ ลองเก็บสักนิดไหม?');
  }

  // ใช้เกินงบ
  if (todayExpense > budgetLimit) {
    sendNotification('⚠️ MyFlow', `ใช้เงินวันนี้ ${todayExpense} บาท — เกินงบที่ตั้งไว้แล้ว!`);
  }
}

// ─── Initializer (เรียกครั้งเดียวตอนเปิดแอป) ────────────────
export async function initNotifications(getEventsFn) {
  await requestPermission();
  notifyOnOpen();
  startCalendarReminder(getEventsFn);

  // เช็คพฤติกรรมทุก 1 ชั่วโมง
  setInterval(checkBehaviorNotifications, 60 * 60 * 1000);
}