import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Mail,
  Smartphone,
  Repeat,
  CheckCircle2,
  Circle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  X,
  Search,
  Check,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Reminder } from '../types';
import { Modal, Input, Textarea, Button, ConfirmDialog } from '../components/ui';

export function RemindersPage() {
  const {
    reminders,
    projects,
    createReminder,
    cancelReminder,
    completeReminder,
    snoozeReminder,
    restoreReminder,
    deleteReminder,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeSnoozeId, setActiveSnoozeId] = useState<string | null>(null);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedRecurrence, setSelectedRecurrence] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'soonest' | 'latest' | 'created' | 'title'>('soonest');

  // Form states
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [channel, setChannel] = useState<'in-app' | 'email' | 'both'>('in-app');

  // Tab counts
  const counts = useMemo(() => {
    return {
      upcoming: reminders.filter((r) => r.status === 'upcoming').length,
      completed: reminders.filter((r) => r.status === 'completed').length,
      cancelled: reminders.filter((r) => r.status === 'cancelled').length,
    };
  }, [reminders]);

  // Projects present in reminders or active
  const reminderProjects = useMemo(() => {
    const map = new Map<string, string>();
    reminders.forEach((r) => {
      if (r.projectId && r.projectTitle) {
        map.set(r.projectId, r.projectTitle);
      }
    });
    projects.forEach((p) => {
      map.set(p.id, p.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [reminders, projects]);

  // Filtered & sorted reminders for the current active tab
  const filteredReminders = useMemo(() => {
    return reminders
      .filter((r) => {
        // Tab status filter
        if (r.status !== activeTab) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchMsg = r.message ? r.message.toLowerCase().includes(q) : false;
          const matchProj = r.projectTitle ? r.projectTitle.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchMsg && !matchProj) return false;
        }

        // Project filter
        if (selectedProject !== 'all' && r.projectId !== selectedProject) {
          return false;
        }

        // Recurrence filter
        if (selectedRecurrence !== 'all' && r.recurrence !== selectedRecurrence) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();

        if (sortBy === 'soonest') return timeA - timeB;
        if (sortBy === 'latest') return timeB - timeA;
        if (sortBy === 'created') return createdB - createdA;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [reminders, activeTab, searchQuery, selectedProject, selectedRecurrence, sortBy]);

  const hasActiveFilters = searchQuery !== '' || selectedProject !== 'all' || selectedRecurrence !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProject('all');
    setSelectedRecurrence('all');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const proj = projects.find((p) => p.id === projectId);
    createReminder({
      projectId: proj?.id,
      projectTitle: proj?.title,
      title: title.trim(),
      message: message.trim() || 'Check in on project progress',
      dateTime: dateTime ? new Date(dateTime).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      recurrence,
      channel,
      enabled: true,
    });

    setTitle('');
    setMessage('');
    setDateTime('');
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-white shadow-[0_0_16px_rgba(139,47,232,0.35)] flex items-center justify-center shrink-0 border border-white/20">
              <Bell className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project Reminders & Pulses
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-body)] mt-1.5 leading-relaxed">
            Keep dormant ideas from slipping away. Schedule nudges to revisit architectural blockers, benchmark models, or review pull requests.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowCreateModal(true)}
          icon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-center shrink-0"
        >
          Add Reminder
        </Button>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-[var(--color-surface)] rounded-2xl p-1.5 flex items-center gap-1.5 border border-[var(--color-border)] shadow-xs w-full sm:w-auto">
          {[
            { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'cancelled', label: 'Dismissed', count: counts.cancelled },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveSnoozeId(null);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white font-semibold shadow-[0_0_12px_rgba(139,47,232,0.3)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick count feedback */}
        <span className="text-xs text-[var(--color-text-secondary)] self-end sm:self-center font-medium">
          Showing {filteredReminders.length} {activeTab} {filteredReminders.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-[var(--shadow-card)] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders by title, message, or project…"
              className="w-full h-[40px] pl-10 pr-9 text-xs sm:text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Project & Recurrence Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[150px] flex-1 sm:flex-initial">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-[40px] text-xs sm:text-sm px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="all">All Projects</option>
                {reminderProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={selectedRecurrence}
                onChange={(e) => setSelectedRecurrence(e.target.value)}
                className="w-full h-[40px] text-xs sm:text-sm px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="all">All Frequencies</option>
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-[40px] text-xs sm:text-sm px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="soonest">Soonest Due</option>
                <option value="latest">Latest Due</option>
                <option value="created">Recently Added</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-[40px] px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reminder List */}
      {filteredReminders.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center shadow-xs space-y-3">
          <CalendarClock className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-bold text-[var(--color-text)]">
            No {activeTab} reminders found
          </h3>
          <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
            {activeTab === 'upcoming'
              ? 'Schedule a gentle check-in or milestone audit to keep yourself accountable to your garden ideas.'
              : activeTab === 'completed'
              ? 'When you check off milestone nudges and resolve blockers, they will appear here.'
              : 'Dismissed nudges are archived here so you can restore them anytime.'}
          </p>
          {activeTab === 'upcoming' && (
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" /> Schedule Reminder
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => {
            const dueDate = new Date(rem.dateTime);
            const isOverdue = !isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now() && rem.status === 'upcoming';
            const formattedDate = !isNaN(dueDate.getTime())
              ? dueDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Flexible date';

            return (
              <div
                key={rem.id}
                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs hover:border-[var(--color-border-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left: Complete Checkbox + Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Action Checkbox Icon */}
                  {rem.status === 'upcoming' ? (
                    <button
                      onClick={() => completeReminder(rem.id)}
                      className="mt-0.5 text-[var(--color-text-secondary)] hover:text-[#34D399] transition-colors cursor-pointer shrink-0"
                      title="Mark as completed"
                      aria-label="Mark reminder completed"
                    >
                      <Circle className="w-5 h-5 group-hover:scale-105 transition-transform" />
                    </button>
                  ) : rem.status === 'completed' ? (
                    <div className="mt-0.5 text-[#34D399] shrink-0" title="Completed">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[var(--color-text-muted)] shrink-0" title="Dismissed">
                      <AlertCircle className="w-5 h-5 opacity-60" />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Title + Project Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm sm:text-base font-bold text-[var(--color-text)] tracking-tight ${rem.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                        {rem.title}
                      </h3>
                      {rem.projectTitle && (
                        <Link
                          to={rem.projectId ? `/projects/${rem.projectId}` : '#'}
                          className="inline-flex"
                          onClick={(e) => !rem.projectId && e.preventDefault()}
                        >
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] border border-[var(--color-border)] font-medium transition-colors">
                            {rem.projectTitle}
                          </span>
                        </Link>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/30">
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Message / Checklist note */}
                    {rem.message && (
                      <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed line-clamp-2">
                        {rem.message}
                      </p>
                    )}

                    {/* Metadata Chips: Due Date, Recurrence, Channel */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[var(--color-text-secondary)]">
                      <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-[var(--color-danger)] font-semibold' : 'text-[var(--color-text-body)]'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Repeat className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" /> {rem.recurrence}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        {rem.channel === 'email' ? (
                          <Mail className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                        )}
                        {rem.channel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: State-Appropriate Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/40 w-full sm:w-auto justify-end">
                  {rem.status === 'upcoming' && (
                    <>
                      {/* Quick Snooze Dropdown */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSnoozeId(activeSnoozeId === rem.id ? null : rem.id)}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                        >
                          <Clock className="w-3.5 h-3.5" /> Snooze
                        </Button>

                        {activeSnoozeId === rem.id && (
                          <div className="absolute right-0 top-9 w-36 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-popover)] py-1.5 z-20 text-xs">
                            <button
                              onClick={() => {
                                snoozeReminder(rem.id, 24);
                                setActiveSnoozeId(null);
                              }}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              +24 Hours
                            </button>
                            <button
                              onClick={() => {
                                snoozeReminder(rem.id, 72);
                                setActiveSnoozeId(null);
                              }}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              +3 Days
                            </button>
                            <button
                              onClick={() => {
                                snoozeReminder(rem.id, 168);
                                setActiveSnoozeId(null);
                              }}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              +1 Week
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dismiss Action */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelReminder(rem.id)}
                        className="text-xs"
                      >
                        Dismiss
                      </Button>
                    </>
                  )}

                  {(rem.status === 'completed' || rem.status === 'cancelled') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreReminder(rem.id)}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      className="text-xs"
                    >
                      Restore
                    </Button>
                  )}

                  {/* Delete Action */}
                  <button
                    onClick={() => setDeleteTargetId(rem.id)}
                    className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-lg hover:bg-[var(--color-surface-hover)]"
                    title="Delete Reminder"
                    aria-label="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Project Reminder"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
              Target Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Reminder Title *"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Re-evaluate local Llama 3 inference latency"
          />

          <Textarea
            label="Message / Action Checklist"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What exact blocker or milestone should be verified?"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 cursor-pointer"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Delivery Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 cursor-pointer"
              >
                <option value="in-app">In-App Notification</option>
                <option value="email">Email Digest</option>
                <option value="both">Both (In-App + Email)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Reminder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteReminder(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title="Delete Reminder"
        message="Are you sure you want to permanently remove this reminder? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

export default RemindersPage;
