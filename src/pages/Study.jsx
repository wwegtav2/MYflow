import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getTopics, saveTopic, deleteTopic, addStudySession } from '../utils/storage';
import { useLanguage } from '../utils/i18n';
import { useToast } from '../components/Toast';
import '../styles/study.css';

const TOPICS_PER_PAGE = 6;
const TASKS_PER_PAGE = 8;

// ─── Progress Bar ────────────────────────────────────────────
function ProgressBar({ percent, size = 'md' }) {
  const color = percent >= 80 ? 'var(--green)' : percent >= 50 ? 'var(--yellow, #facc15)' : 'var(--red)';
  return (
    <div className={`progress-bar-track ${size}`}>
      <div
        className="progress-bar-fill"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >←</button>
      {pages.map(p => (
        <button
          key={p}
          className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >{p}</button>
      ))}
      <button
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >→</button>
    </div>
  );
}

// ─── Checkbox Item ───────────────────────────────────────────
function CheckboxItem({ task, onToggle, onDelete, selected, onSelect }) {
  return (
    <div className={`checkbox-item ${task.done ? 'done' : ''}`}>
      {onSelect && (
        <input
          type="checkbox"
          className="select-check"
          checked={selected}
          onChange={onSelect}
        />
      )}
      <button className="checkbox-btn" onClick={onToggle}>
        {task.done ? '✔' : ''}
      </button>
      <span className="checkbox-text">{task.name}</span>
      <button className="checkbox-del" onClick={onDelete}>✕</button>
    </div>
  );
}

// ─── Topic Card (list view) ──────────────────────────────────
function TopicCard({ topic, onOpen, selected, onSelect, manageMode }) {
  const tasks = topic.tasks || [];
  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className={`topic-card card ${selected ? 'selected' : ''}`}>
      <div className="topic-header">
        {manageMode && (
          <input
            type="checkbox"
            className="select-check"
            checked={selected}
            onChange={onSelect}
          />
        )}
        <div className="topic-header-content" onClick={onOpen}>
          <span className="topic-arrow">▶</span>
          <span className="topic-title">{topic.title}</span>
          <span className="topic-percent">{percent}%</span>
        </div>
      </div>

      <div className="topic-progress-row">
        <ProgressBar percent={percent} />
        <span className="topic-progress-text">{doneCount}/{totalCount}</span>
      </div>
    </div>
  );
}

// ─── Topic Detail View (dedicated page) ─────────────────────
function TopicDetailView({ topic, onUpdate, onDelete, onBack }) {
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [taskPage, setTaskPage] = useState(1);
  const [manageMode, setManageMode] = useState(false);
  const { t } = useLanguage();
  const { showToast } = useToast();

  const tasks = topic.tasks || [];
  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const totalTaskPages = Math.max(1, Math.ceil(tasks.length / TASKS_PER_PAGE));
  const pagedTasks = tasks.slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE);

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const newTask = { id: Date.now().toString(), name: newTaskName.trim(), done: false };
    onUpdate({ ...topic, tasks: [...tasks, newTask] });
    setNewTaskName('');
    // go to last page to see the new item
    const newTotal = Math.ceil((tasks.length + 1) / TASKS_PER_PAGE);
    setTaskPage(newTotal);
    showToast(t('toast.subtopicAdded'), 'success');
  };

  const toggleTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    onUpdate({
      ...topic,
      tasks: tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    });
    if (task && !task.done) showToast(t('toast.subtopicCompleted'), 'success');
  };

  const deleteTask = (taskId) => {
    onUpdate({ ...topic, tasks: tasks.filter(t => t.id !== taskId) });
    setSelectedTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; });
  };

  const handleDelete = () => {
    if (!window.confirm(t('study.confirmDeleteTopic'))) return;
    onDelete();
    onBack();
  };

  const toggleSelectTask = (taskId) => {
    setSelectedTasks(prev => {
      const n = new Set(prev);
      n.has(taskId) ? n.delete(taskId) : n.add(taskId);
      return n;
    });
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const deleteSelectedTasks = () => {
    if (selectedTasks.size === 0) return;
    if (!window.confirm(`${t('study.confirmDeleteSubtopics')} ${selectedTasks.size} ${t('study.subtopicWord')}?`)) return;
    onUpdate({ ...topic, tasks: tasks.filter(t => !selectedTasks.has(t.id)) });
    setSelectedTasks(new Set());
    setManageMode(false);
    setTaskPage(1);
  };

  // fix page if items removed
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(tasks.length / TASKS_PER_PAGE));
    if (taskPage > maxPage) setTaskPage(maxPage);
  }, [tasks.length, taskPage]);

  return (
    <div className="study-page fade-in">
      <button className="back-btn" onClick={onBack}>{t('study.back')}</button>

      <div className="topic-detail-header card">
        <div className="topic-detail-top">
          <div className="topic-detail-title">{topic.title}</div>
          <button className="btn danger" onClick={handleDelete}>{t('study.deleteTopic')}</button>
        </div>
        <div className="topic-detail-stats">
          <span className="topic-detail-percent">{percent}%</span>
          <span className="topic-detail-count">{doneCount}/{totalCount} {t('study.completed')}</span>
        </div>
        <ProgressBar percent={percent} size="lg" />
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 className="section-h3">{t('study.addSubtopic')}</h3>
        <div className="add-row">
          <input
            placeholder={t('study.addSubtopicPlaceholder')}
            value={newTaskName}
            onChange={e => setNewTaskName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            autoFocus
          />
          <button className="btn primary" onClick={addTask}>{t('study.add')}</button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div className="section-h3-row">
          <h3 className="section-h3">{t('study.allSubtopics')} ({totalCount})</h3>
          {tasks.length > 0 && (
            <div className="bulk-actions">
              {!manageMode ? (
                <button className="manage-btn" onClick={() => setManageMode(true)}>{t('study.manage')}</button>
              ) : (
                <>
                  <button className="bulk-select-btn" onClick={selectAllTasks}>
                    {selectedTasks.size === tasks.length ? t('study.unselectAll') : t('study.selectAll')}
                  </button>
                  {selectedTasks.size > 0 && (
                    <button className="btn danger bulk-del-btn" onClick={deleteSelectedTasks}>
                      {t('study.deleteSelected')} ({selectedTasks.size})
                    </button>
                  )}
                  <button className="manage-btn" onClick={() => { setManageMode(false); setSelectedTasks(new Set()); }}>{t('study.cancel')}</button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="subtask-list">
          {tasks.length === 0 && (
            <div className="empty-state" style={{ padding: '1rem' }}>{t('study.noSubtopics')}</div>
          )}
          {pagedTasks.map(task => (
            <CheckboxItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
              selected={selectedTasks.has(task.id)}
              onSelect={manageMode ? () => toggleSelectTask(task.id) : undefined}
            />
          ))}
        </div>
        <Pagination currentPage={taskPage} totalPages={totalTaskPages} onPageChange={setTaskPage} />
      </div>
    </div>
  );
}

// ─── Fullscreen Timer ────────────────────────────────────────
function FullscreenTimer({ topicTitle, onStop }) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const fmt = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return { h, m, sec };
  };

  const { h, m, sec } = fmt(seconds);

  const handleStop = () => {
    clearInterval(intervalRef.current);
    onStop(seconds);
  };

  return ReactDOM.createPortal(
    <div className="timer-fullscreen">
      <div className="timer-fullscreen-inner">
        {topicTitle && (
          <div className="timer-topic-label">
            📖 {topicTitle}
          </div>
        )}
        {!topicTitle && (
          <div className="timer-topic-label">
            {t('study.studyFreeLabel')}
          </div>
        )}

        <div className="timer-display-big">
          <span className="timer-digit">{h}</span>
          <span className="timer-colon">:</span>
          <span className="timer-digit">{m}</span>
          <span className="timer-colon">:</span>
          <span className="timer-digit">{sec}</span>
        </div>

        <div className="timer-labels">
          <span>{t('study.hours')}</span>
          <span>{t('study.minutes')}</span>
          <span>{t('study.seconds')}</span>
        </div>

        <button className="timer-stop-btn" onClick={handleStop}>
          {t('study.stopAndSave')}
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Timer Start Panel ───────────────────────────────────────
function TimerStartPanel({ topics, onStart }) {
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const { t } = useLanguage();

  return (
    <div className="timer-start-panel card">
      <div className="timer-start-header">
        <span className="timer-start-icon">⏱️</span>
        <span className="timer-start-title">{t('study.studyTimer')}</span>
      </div>
      <div className="timer-start-body">
        <div className="timer-select-row">
          <select
            value={selectedTopicId}
            onChange={e => setSelectedTopicId(e.target.value)}
            className="timer-select"
          >
            <option value="">{t('study.freeStudyOption')}</option>
            {topics.map(tp => (
              <option key={tp.id} value={tp.id}>{tp.title}</option>
            ))}
          </select>
          <button
            className="btn primary timer-go-btn"
            onClick={() => onStart(selectedTopicId || null)}
          >
            {t('study.startTimer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Progress ─────────────────────────────────────────
function GlobalProgress({ topics }) {
  const { t } = useLanguage();
  const topicsWithTasks = topics.filter(tp => (tp.tasks || []).length > 0);

  if (topicsWithTasks.length === 0) return null;

  const globalPercent = Math.round(
    topicsWithTasks.reduce((sum, topic) => {
      const tasks = topic.tasks || [];
      const done = tasks.filter(tk => tk.done).length;
      return sum + (done / tasks.length) * 100;
    }, 0) / topicsWithTasks.length
  );

  const totalTasks = topics.reduce((s, tp) => s + (tp.tasks || []).length, 0);
  const totalDone = topics.reduce((s, tp) => s + (tp.tasks || []).filter(x => x.done).length, 0);

  return (
    <div className="global-progress card">
      <div className="global-progress-header">
        <span className="global-progress-label">{t('study.overallProgress')}</span>
        <span className="global-progress-percent">{globalPercent}%</span>
      </div>
      <ProgressBar percent={globalPercent} size="lg" />
      <div className="global-progress-detail">
        <span>{t('study.completed')} {totalDone} / {totalTasks} {t('study.subtopics')}</span>
        <span>{topics.length} {t('study.mainTopics')}</span>
      </div>
    </div>
  );
}

// ─── Main Study page ──────────────────────────────────────────
export default function Study() {
  const [topics, setTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [timerTopicId, setTimerTopicId] = useState(null);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [topicPage, setTopicPage] = useState(1);
  const [topicManageMode, setTopicManageMode] = useState(false);
  const { t } = useLanguage();
  const { showToast } = useToast();

  const refresh = useCallback(() => {
    const loaded = getTopics();
    // migrate old data: convert subtopics to tasks if needed
    const migrated = loaded.map(tp => {
      if (tp.tasks) return tp;
      if (tp.subtopics) {
        return {
          ...tp,
          tasks: tp.subtopics.map(s => ({
            id: s.id,
            name: s.name,
            done: (s.todos || []).length > 0 && (s.todos || []).every(td => td.done)
          }))
        };
      }
      return { ...tp, tasks: [] };
    });
    setTopics(migrated);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    const topic = { id: Date.now().toString(), title: newTopicName.trim(), tasks: [] };
    saveTopic(topic);
    setNewTopicName('');
    refresh();
    setActiveTopicId(topic.id);
    showToast(t('toast.topicCreated'), 'success');
  };

  const handleUpdateTopic = (updated) => {
    saveTopic(updated);
    refresh();
  };

  const handleDeleteTopic = (id) => {
    if (!window.confirm(t('study.confirmDeleteTopic'))) return;
    deleteTopic(id);
    setSelectedTopics(prev => { const n = new Set(prev); n.delete(id); return n; });
    refresh();
    showToast(t('toast.topicDeleted'), 'success');
  };

  const toggleSelectTopic = (id) => {
    setSelectedTopics(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllTopics = () => {
    if (selectedTopics.size === topics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(topics.map(tp => tp.id)));
    }
  };

  const deleteSelectedTopics = () => {
    if (selectedTopics.size === 0) return;
    if (!window.confirm(`${t('study.confirmDeleteTopics')} ${selectedTopics.size} ${t('study.topics')}?`)) return;
    selectedTopics.forEach(id => deleteTopic(id));
    setSelectedTopics(new Set());
    setTopicManageMode(false);
    setTopicPage(1);
    refresh();
    showToast(t('toast.topicDeleted'), 'success');
  };

  const handleStartTimer = (topicId) => {
    setTimerTopicId(topicId);
    setTimerActive(true);
  };

  const handleStopTimer = (seconds) => {
    if (seconds > 0) {
      addStudySession(timerTopicId || '', '', seconds);
      showToast(t('toast.timerSaved'), 'success');
    }
    setTimerActive(false);
    setTimerTopicId(null);
  };

  const timerTopicTitle = timerTopicId
    ? (topics.find(tp => tp.id === timerTopicId)?.title || '')
    : null;

  // ─── Detail view ───────────────────────────────────
  const activeTopic = activeTopicId ? topics.find(tp => tp.id === activeTopicId) : null;

  if (activeTopic) {
    return (
      <>
        <TopicDetailView
          topic={activeTopic}
          onUpdate={handleUpdateTopic}
          onDelete={() => { deleteTopic(activeTopic.id); refresh(); }}
          onBack={() => setActiveTopicId(null)}
        />
        {timerActive && (
          <FullscreenTimer topicTitle={timerTopicTitle} onStop={handleStopTimer} />
        )}
      </>
    );
  }

  // ─── List view ─────────────────────────────────────
  const totalTopicPages = Math.max(1, Math.ceil(topics.length / TOPICS_PER_PAGE));
  const safeTopicPage = topicPage > totalTopicPages ? totalTopicPages : topicPage;
  const pagedTopics = topics.slice((safeTopicPage - 1) * TOPICS_PER_PAGE, safeTopicPage * TOPICS_PER_PAGE);

  return (
    <div className="study-page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">{t('study.title')}</div>
          <div className="page-subtitle">{t('study.subtitle')}</div>
        </div>
      </div>

      <GlobalProgress topics={topics} />

      {/* Timer */}
      <TimerStartPanel topics={topics} onStart={handleStartTimer} />

      {timerActive && (
        <FullscreenTimer
          topicTitle={timerTopicTitle}
          onStop={handleStopTimer}
        />
      )}

      {/* Add topic */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 className="section-h3">{t('study.addNewTopic')}</h3>
        <div className="add-row">
          <input
            placeholder={t('study.addNewTopicPlaceholder')}
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
          />
          <button className="btn primary" onClick={handleAddTopic}>{t('study.add')}</button>
        </div>
      </div>

      {/* Bulk actions for topics */}
      {topics.length > 0 && (
        <div className="bulk-actions-bar">
          {!topicManageMode ? (
            <button className="manage-btn" onClick={() => setTopicManageMode(true)}>{t('study.manage')}</button>
          ) : (
            <>
              <button className="bulk-select-btn" onClick={selectAllTopics}>
                {selectedTopics.size === topics.length ? t('study.unselectAll') : t('study.selectAll')}
              </button>
              {selectedTopics.size > 0 && (
                <button className="btn danger bulk-del-btn" onClick={deleteSelectedTopics}>
                  {t('study.deleteSelected')} ({selectedTopics.size})
                </button>
              )}
              <button className="manage-btn" onClick={() => { setTopicManageMode(false); setSelectedTopics(new Set()); }}>{t('study.cancel')}</button>
            </>
          )}
        </div>
      )}

      {/* Topics */}
      {topics.length === 0 && (
        <div className="empty-state">{t('study.noTopics')}</div>
      )}
      {pagedTopics.map(topic => (
        <TopicCard
          key={topic.id}
          topic={topic}
          onOpen={() => setActiveTopicId(topic.id)}
          selected={selectedTopics.has(topic.id)}
          onSelect={() => toggleSelectTopic(topic.id)}
          manageMode={topicManageMode}
        />
      ))}
      <Pagination currentPage={safeTopicPage} totalPages={totalTopicPages} onPageChange={setTopicPage} />
    </div>
  );
}