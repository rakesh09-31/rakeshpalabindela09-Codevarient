import { useState } from 'react';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Mail,
  Smartphone,
  Repeat,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Badge, Modal, Input, Textarea, Button } from '../components/ui';

export function RemindersPage() {
  const { reminders, projects, createReminder, cancelReminder, deleteReminder } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [channel, setChannel] = useState<'in-app' | 'email' | 'both'>('in-app');

  const filteredReminders = reminders.filter((r) => r.status === activeTab);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const proj = projects.find((p) => p.id === projectId);
    createReminder({
      projectId: proj?.id,
      projectTitle: proj?.title,
      title: title.trim(),
      message: message.trim() || 'Check in on project progress',
      dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[var(--color-text)] dark:text-[var(--color-text)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project Reminders & Pulses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-1">
            Keep dormant ideas from slipping away. Schedule nudges to revisit blockers, benchmark models, or review pull requests.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Schedule Reminder
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 rounded-2xl p-1.5 flex items-center gap-1.5 border border-[var(--color-border)] dark:border-[var(--color-border)]/80 max-w-md">
        {[
          { id: 'upcoming', label: 'Upcoming Nudges', count: reminders.filter((r) => r.status === 'upcoming').length },
          { id: 'completed', label: 'Completed', count: reminders.filter((r) => r.status === 'completed').length },
          { id: 'cancelled', label: 'Dismissed', count: reminders.filter((r) => r.status === 'cancelled').length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white font-semibold shadow-2xs'
                  : 'text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-[var(--color-surface-subtle)] text-white dark:bg-zinc-200 dark:text-[var(--color-text)]'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reminder List */}
      {filteredReminders.length === 0 ? (
        <div className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] dark:border-[var(--color-border)]/80 p-12 text-center shadow-2xs">
          <Clock className="w-10 h-10 text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">No {activeTab} reminders</h3>
          <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Schedule a gentle check-in to keep yourself accountable to your garden ideas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => (
            <div
              key={rem.id}
              className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] dark:border-[var(--color-border)]/80 p-5 md:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 flex items-center justify-center text-[var(--color-text)] dark:text-[var(--color-text)] mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">{rem.title}</h3>
                    {rem.projectTitle && (
                      <Badge variant="tech" size="sm">
                        {rem.projectTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-1 leading-relaxed">{rem.message}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--color-text-muted)] mt-2.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]" />
                      {new Date(rem.dateTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      <Repeat className="w-3.5 h-3.5" /> {rem.recurrence}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      {rem.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />} {rem.channel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {rem.status === 'upcoming' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelReminder(rem.id)}
                  >
                    Dismiss
                  </Button>
                )}
                <button
                  onClick={() => deleteReminder(rem.id)}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white transition-colors cursor-pointer"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule Project Reminder"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
              Select Target Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-[var(--color-border)] dark:focus:border-indigo-400 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[var(--color-surface)]">
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
            placeholder="e.g. Re-evaluate OpenAI API pricing vs DeepSeek"
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
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)]"
              >
                <option value="once">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Delivery Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)]"
              >
                <option value="in-app">In-App Banner</option>
                <option value="email">Email Digest</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Set Reminder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default RemindersPage;
