import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  getCategories, addCategory, deleteCategory, getCategorySummary,
  addCategoryTransaction, getCategoryTransactions, deleteCategoryTransaction
} from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import { useToast } from '../components/Toast';
import '../styles/finance.css';

const INCOME_PRESETS = [5, 10, 20, 50, 100, 200, 500];
const EXPENSE_PRESETS = [10, 20, 50, 100, 200, 500, 1000];

// QuickButtons Component
function QuickButtons({ presets, onSelect, color }) {
  const [custom, setCustom] = useState('');
  const { t } = useLanguage();

  const handleCustom = () => {
    const n = Number(custom);
    if (n > 0) { onSelect(n); setCustom(''); }
  };

  return (
    <div className="quick-btns">
      {presets.map(p => (
        <button key={p} className={`preset-btn ${color}`} onClick={() => onSelect(p)}>
          {p.toLocaleString()}
        </button>
      ))}
      <div className="custom-input-row">
        <input
          type="number"
          placeholder={t('finance.customAmount')}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
          min="0"
        />
        <button className={`preset-btn ${color}`} onClick={handleCustom}>{t('finance.save')}</button>
      </div>
    </div>
  );
}

function SummaryBar({ summary }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="summary-bar">
        <div className="sum-item">
          <span className="sum-label">{t('finance.incomeToday')}</span>
          <span className="sum-val saving">+{summary.todayIncome.toLocaleString()} ฿</span>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-label">{t('finance.accumulated')}</span>
          <span className="sum-val saving">{summary.totalIncome.toLocaleString()} ฿</span>
        </div>
      </div>

      <div className="summary-bar">
        <div className="sum-item">
          <span className="sum-label">{t('finance.expenseToday')}</span>
          <span className="sum-val expense">-{summary.todayExpense.toLocaleString()} ฿</span>
        </div>
        <div className="sum-divider" />
        <div className="sum-item">
          <span className="sum-label">{t('finance.accumulated')}</span>
          <span className="sum-val expense">{summary.totalExpense.toLocaleString()} ฿</span>
        </div>
      </div>

      <div className="summary-bar">
        <div className="sum-item">
          <span className="sum-label">{t('finance.net')}</span>
          <span className={`sum-val ${summary.totalNet >= 0 ? 'saving' : 'expense'}`}>
            {summary.totalNet > 0 ? '+' : ''}{summary.totalNet.toLocaleString()} ฿
          </span>
        </div>
      </div>
    </div>
  );
}

// Add Amount Block (inside category detail)
function AddAmountBlock({ category, onAdd, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [reason, setReason] = useState('');
  const [currentType, setCurrentType] = useState('income');
  const { t } = useLanguage();

  const handleAdd = (amount) => {
    onAdd(amount, reason, currentType);
    setReason('');
  };

  const presets = currentType === 'expense' ? EXPENSE_PRESETS : INCOME_PRESETS;
  const colorClass = currentType === 'expense' ? 'expense' : 'saving';

  return (
    <div className="finance-block">
      <div className="block-header" onClick={() => setExpanded(!expanded)}>
        <div className="block-title">
          <span className="block-icon">➕</span>
          <span className="block-name">{t('finance.addItem')}</span>
        </div>
        <span style={{ fontSize: '18px', transition: 'transform 0.3s' }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="block-content">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentType('income')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: currentType === 'income' ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: currentType === 'income' ? 'var(--accent)' : 'var(--bg-card)',
                color: currentType === 'income' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all var(--transition)'
              }}
            >
              {t('finance.income')}
            </button>
            <button
              onClick={() => setCurrentType('expense')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: currentType === 'expense' ? '2px solid var(--red)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: currentType === 'expense' ? 'var(--red)' : 'var(--bg-card)',
                color: currentType === 'expense' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all var(--transition)'
              }}
            >
              {t('finance.expense')}
            </button>
          </div>

          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>{t('finance.selectAmount')}</h4>
            <QuickButtons
              presets={presets}
              color={colorClass}
              onSelect={handleAdd}
            />
          </div>

          {/* Reason field for both income and expense */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t('finance.reason')}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('finance.reasonPlaceholder')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${reason.trim() ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
                minHeight: '60px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Category List View
function CategoryListView({ categories, onSelectCategory, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t } = useLanguage();
  const { showToast } = useToast();

  const handleCreateCategory = (name, icon, type) => {
    addCategory(name, icon, type);
    setShowCreateModal(false);
    onRefresh();
    showToast(t('toast.categoryCreated'), 'success');
  };

  return (
    <div className="finance-page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">{t('finance.title')}</div>
          <div className="page-subtitle">{t('finance.subtitle')}</div>
        </div>
      </div>

      <div className="categories-grid">
        {categories.map(cat => (
          <div 
            key={cat.id}
            className="category-card"
            onClick={() => onSelectCategory(cat.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="category-icon">{cat.icon}</div>
            <div className="category-name">{cat.name}</div>
            <button
              className="category-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`${t('finance.confirmDeleteCategory')} "${cat.name}"?`)) {
                  deleteCategory(cat.id);
                  onRefresh();
                  showToast(t('toast.categoryDeleted'), 'success');
                }
              }}
              title={t('finance.deleteCategory')}
            >
              🗑️
            </button>
          </div>
        ))}
        
        <div 
          className="category-card add-new"
          onClick={() => setShowCreateModal(true)}
          style={{ cursor: 'pointer', opacity: 0.7 }}
        >
          <div className="category-icon">➕</div>
          <div className="category-name">{t('finance.createCategory')}</div>
        </div>
      </div>

      {showCreateModal && (
        <CreateCategoryModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCategory}
        />
      )}
    </div>
  );
}

// Create Category Modal
function CreateCategoryModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💼');
  const [type, setType] = useState('income');
  const { t } = useLanguage();

  const handleCreate = () => {
    if (!name.trim()) {
      alert(t('finance.pleaseEnterName'));
      return;
    }
    onCreate(name, icon, type);
  };

  const ICON_PRESETS = ['💰', '💸', '🎓', '📱', '💼', '🛒', '🍽️', '🚗', '🏠', '📚'];

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('finance.createCategoryTitle')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('finance.categoryName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('finance.categoryNamePlaceholder')}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('finance.icon')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {ICON_PRESETS.map(ico => (
                <button
                  key={ico}
                  onClick={() => setIcon(ico)}
                  style={{
                    padding: '10px',
                    fontSize: '24px',
                    border: icon === ico ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: icon === ico ? 'var(--accent)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all var(--transition)'
                  }}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--accent)',
              border: 'none',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            {t('finance.createCategoryBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Category Detail View
function CategoryDetailView({ categoryId, categories, onBack, onRefresh }) {
  const category = categories.find(c => c.id === categoryId);
  const summary = getCategorySummary(categoryId);
  const transactions = getCategoryTransactions(categoryId);
  const [page, setPage] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const ITEMS_PER_PAGE = 15;
  const today = new Date().toISOString().slice(0, 10);
  const { t } = useLanguage();
  const { showToast } = useToast();

  if (!category) return null;

  const grouped = transactions.reduce((acc, tx) => {
    const label = tx.date === today ? t('finance.today') : tx.date;
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {});

  const flatList = Object.entries(grouped).flatMap(([date, txs]) => 
    txs.map(tx => ({ ...tx, dateLabel: date }))
  );

  const totalPages = Math.ceil(flatList.length / ITEMS_PER_PAGE);
  const paginatedList = flatList.slice(0, (page + 1) * ITEMS_PER_PAGE);

  const displayGrouped = paginatedList.reduce((acc, tx) => {
    const label = tx.dateLabel;
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {});

  const handleAddTransaction = (amount, reason, txType) => {
    addCategoryTransaction(categoryId, txType, amount, reason);
    onRefresh();
    showToast(t('toast.transactionAdded'), 'success');
  };

  const handleDeleteTransaction = (txId) => {
    deleteCategoryTransaction(categoryId, txId);
    onRefresh();
    showToast(t('toast.transactionDeleted'), 'success');
  };

  const handleToggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === flatList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flatList.map(tx => tx.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${t('finance.confirmDeleteItems')} ${selectedIds.size} ${t('finance.items')}?`)) return;
    
    selectedIds.forEach(id => handleDeleteTransaction(id));
    setSelectedIds(new Set());
    setPage(0);
  };

  return (
    <div className="finance-page fade-in">
      <div className="page-header">
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 600
          }}
        >
          {t('finance.back')}
        </button>
        <div>
          <div className="page-title">{category.name}</div>
        </div>
      </div>

      <SummaryBar summary={summary} />

      <AddAmountBlock 
        category={category}
        onAdd={handleAddTransaction}
        onRefresh={onRefresh}
      />

      <div className="card">
        <h3 className="section-h3">{t('finance.history')}</h3>
        
        {transactions.length === 0 ? (
          <div className="empty-state">{t('finance.noItems')}</div>
        ) : (
          <div className="tx-list-container">
            <div className="select-controls">
              <button 
                className={`btn ${selectMode ? 'primary' : ''}`}
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedIds(new Set());
                }}
              >
                {selectMode ? t('finance.selectMode') : t('finance.selectDelete')}
              </button>

              {selectMode && (
                <>
                  <button 
                    className={`btn ${selectedIds.size === flatList.length ? 'primary' : ''}`}
                    onClick={handleSelectAll}
                  >
                    {selectedIds.size === flatList.length ? t('finance.selectedAll') : t('finance.selectAll')}
                  </button>

                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, flex: 1 }}>
                    {t('finance.selected')}: {selectedIds.size} / {flatList.length}
                  </span>

                  <button 
                    className="btn danger"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                    style={{ opacity: selectedIds.size === 0 ? 0.5 : 1, cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    🗑 {t('finance.delete')} ({selectedIds.size})
                  </button>
                </>
              )}
            </div>

            <div className="tx-list">
              {Object.entries(displayGrouped).map(([date, txs]) => (
                <div key={date} className="tx-group">
                  <div className="tx-date-header">{date}</div>
                  {txs.map(tx => (
                    <div key={tx.id} className={`tx-item ${tx.type} ${selectMode ? 'select-mode' : ''}`}>
                      {selectMode && (
                        <input 
                          type="checkbox" 
                          className="tx-checkbox"
                          checked={selectedIds.has(tx.id)} 
                          onChange={() => handleToggleSelect(tx.id)}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="tx-icon">{tx.type === 'expense' ? '💸' : '📥'}</span>
                          <span className="tx-amount">{tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString()} ฿</span>
                          <span className="tx-time">
                            {new Date(tx.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            {' '}
                            {new Date(tx.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {tx.reason && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '32px' }}>
                            📝 {tx.reason}
                          </div>
                        )}
                      </div>
                      {!selectMode && (
                        <button className="tx-delete btn danger" onClick={() => handleDeleteTransaction(tx.id)}>{t('finance.delete')}</button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  className="btn" 
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                >
                  {t('finance.prev')}
                </button>
                <span className="pagination-info">
                  {t('finance.page')} {page + 1} / {totalPages} ({paginatedList.length} / {flatList.length} {t('finance.items')})
                </span>
                <button 
                  className="btn" 
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                >
                  {t('finance.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Finance() {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categories, setCategories] = useState(getCategories());

  const refresh = useCallback(() => {
    setCategories(getCategories());
  }, []);

  return (
    selectedCategoryId ? (
      <CategoryDetailView 
        categoryId={selectedCategoryId}
        categories={categories}
        onBack={() => setSelectedCategoryId(null)}
        onRefresh={refresh}
      />
    ) : (
      <CategoryListView 
        categories={categories}
        onSelectCategory={setSelectedCategoryId}
        onRefresh={refresh}
      />
    )
  );
}