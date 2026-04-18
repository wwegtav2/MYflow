// ============================================================
// storage.js — localStorage helper
// ============================================================

const PREFIX = 'myflow_';

export const storage = {
  save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage save error:', e);
      return false;
    }
  },

  load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage load error:', e);
      return defaultValue;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};

// ============================================================
// Finance helpers
// ============================================================

export function addTransaction(type, amount, reason = '') {
  const transactions = storage.load('transactions', []);
  const newTx = {
    id: Date.now().toString(),
    type,           // 'expense' | 'income'
    amount: Number(amount),
    reason: reason || '',
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    createdAt: Date.now()
  };
  transactions.unshift(newTx);
  storage.save('transactions', transactions);
  return newTx;
}

export function getTransactions() {
  return storage.load('transactions', []);
}

export function deleteTransaction(id) {
  const txs = storage.load('transactions', []);
  storage.save('transactions', txs.filter(t => t.id !== id));
}

export function getFinanceSummary() {
  const today = new Date().toISOString().slice(0, 10);

  // รวมทั้ง transactions เก่า + categoryTransactions ทุกหมวด
  const oldTxs = getTransactions();
  const catTxsMap = storage.load('categoryTransactions', {});
  const catTxs = Object.values(catTxsMap).flat();
  const all = [...oldTxs, ...catTxs];

  const todayTxs = all.filter(t => t.date === today);

  // วันนี้
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayIncome  = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const netToday = todayIncome - todayExpense;

  // สะสมทั้งหมด
  const totalExpense = all.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome  = all.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalNet = totalIncome - totalExpense;

  return { 
    todayExpense, 
    todayIncome, 
    totalExpense,
    totalIncome, 
    netToday,
    totalNet
  };
}

// ============================================================
// Finance Categories
// ============================================================

const DEFAULT_CATEGORIES = [];

export function getCategories() {
  const categories = storage.load('financeCategories', DEFAULT_CATEGORIES);
  // Ensure default categories exist
  DEFAULT_CATEGORIES.forEach(defCat => {
    if (!categories.find(c => c.id === defCat.id)) {
      categories.push(defCat);
    }
  });
  storage.save('financeCategories', categories);
  return categories;
}

export function addCategory(name, icon, type) {
  const categories = getCategories();
  const newCat = {
    id: Date.now().toString(),
    name,
    icon,
    type // 'income' or 'expense'
  };
  categories.unshift(newCat);
  storage.save('financeCategories', categories);
  return newCat;
}

export function deleteCategory(categoryId) {
  const categories = getCategories();
  storage.save('financeCategories', categories.filter(c => c.id !== categoryId));
  // ลบ transactions ที่ผูกกับหมวดนี้ด้วย
  const txs = storage.load('categoryTransactions', {});
  delete txs[categoryId];
  storage.save('categoryTransactions', txs);
}

export function getCategorySummary(categoryId) {
  const today = new Date().toISOString().slice(0, 10);
  const txs = storage.load('categoryTransactions', {});
  const categoryTxs = txs[categoryId] || [];
  const todayTxs = categoryTxs.filter(t => t.date === today);

  // วันนี้
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayIncome  = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // สะสมทั้งหมด
  const totalExpense = categoryTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome  = categoryTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return {
    todayExpense,
    todayIncome,
    totalExpense,
    totalIncome,
    netToday: todayIncome - todayExpense,
    totalNet: totalIncome - totalExpense
  };
}

export function addCategoryTransaction(categoryId, type, amount, reason = '') {
  const txs = storage.load('categoryTransactions', {});
  if (!txs[categoryId]) txs[categoryId] = [];
  
  const newTx = {
    id: Date.now().toString(),
    type,
    amount: Number(amount),
    reason: reason || '',
    date: new Date().toISOString().slice(0, 10),
    createdAt: Date.now()
  };
  txs[categoryId].unshift(newTx);
  storage.save('categoryTransactions', txs);
  return newTx;
}

export function getCategoryTransactions(categoryId) {
  const txs = storage.load('categoryTransactions', {});
  return txs[categoryId] || [];
}

export function deleteCategoryTransaction(categoryId, transactionId) {
  const txs = storage.load('categoryTransactions', {});
  if (txs[categoryId]) {
    txs[categoryId] = txs[categoryId].filter(t => t.id !== transactionId);
  }
  storage.save('categoryTransactions', txs);
}

// ============================================================
// Study helpers
// ============================================================

export function getTopics() {
  return storage.load('topics', []);
}

export function saveTopic(topic) {
  const topics = getTopics();
  const idx = topics.findIndex(t => t.id === topic.id);
  if (idx >= 0) topics[idx] = topic;
  else topics.unshift(topic);
  storage.save('topics', topics);
}

export function deleteTopic(id) {
  storage.save('topics', getTopics().filter(t => t.id !== id));
}

export function addStudySession(topicId, subtopicId, seconds) {
  const sessions = storage.load('studySessions', []);
  sessions.push({
    id: Date.now().toString(),
    topicId,
    subtopicId,
    seconds,
    date: new Date().toISOString().slice(0, 10),
    createdAt: Date.now()
  });
  storage.save('studySessions', sessions);
}

export function getStudySummaryToday() {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = storage.load('studySessions', []).filter(s => s.date === today);
  const totalSeconds = sessions.reduce((s, x) => s + x.seconds, 0);
  return { totalSeconds, sessions };
}

export function getStudyProgress() {
  const topics = getTopics();
  if (topics.length === 0) return { percent: 0, done: 0, total: 0, topicCount: 0 };
  const tasks = topics.flatMap(t => t.tasks || []);
  const total = tasks.length;
  if (total === 0) return { percent: 0, done: 0, total: 0, topicCount: topics.length };
  const done = tasks.filter(t => t.done).length;
  const percent = Math.round((done / total) * 100);
  return { percent, done, total, topicCount: topics.length };
}

// ============================================================
// Calendar helpers
// ============================================================

export function getEvents() {
  return storage.load('calendarEvents', []);
}

export function addEvent(event) {
  const events = getEvents();
  events.push({ ...event, id: Date.now().toString() });
  storage.save('calendarEvents', events);
}

export function deleteEvent(id) {
  storage.save('calendarEvents', getEvents().filter(e => e.id !== id));
}

// ============================================================
// Settings helpers
// ============================================================

export function getSettings() {
  return storage.load('settings', {
    theme: 'dark',
    font: 'Sarabun',
    primaryColor: '#7c6fff',
    animationsEnabled: true,
    weatherCity: 'Hat Yai',
    weatherUnit: 'metric',
    clockTimezone: 'Asia/Bangkok',
    backgroundType: 'color',
    backgroundColor: '#0d0d1a',
    backgroundUrl: '',
    clockBold: false,
    clockColor: '#7c6fff',
    clockBox: false
  });
}

export function saveSettings(patch) {
  const current = getSettings();
  return storage.save('settings', { ...current, ...patch });
}

// Background file stored separately to avoid localStorage quota issues
export function saveBackgroundFile(dataUrl) {
  try {
    localStorage.setItem(PREFIX + 'bgFile', dataUrl);
    return true;
  } catch (e) {
    console.error('Background save error:', e);
    return false;
  }
}

export function getBackgroundFile() {
  return localStorage.getItem(PREFIX + 'bgFile') || '';
}

export function clearBackgroundFile() {
  localStorage.removeItem(PREFIX + 'bgFile');
}

// ============================================================
// Reset helpers
// ============================================================

export function resetDashboardData() {
  storage.remove('transactions');
  storage.remove('categoryTransactions');
  storage.remove('financeCategories');
  storage.remove('topics');
  storage.remove('studySessions');
  storage.remove('calendarEvents');
}