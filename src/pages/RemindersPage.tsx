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
import { Badge, Modal, Input, Textarea } from '../components/ui';

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-warm flex items-center justify-center text-amber">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              Project Reminders & Pulses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-light mt-1">
            Keep dormant ideas from slipping away. Schedule nudges to revisit blockers, benchmark models, or review pull requests.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-light shadow-sm self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Schedule Reminder
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-green-border/40 pb-2">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-light hover:bg-ivory-warm'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-forest-light text-white' : 'bg-gray-green-light/40 text-charcoal'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reminder List */}
      {filteredReminders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-green-border/60 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-green-light mx-auto mb-3" />
          <h3 className="text-base font-semibold text-charcoal">No {activeTab} reminders</h3>
          <p className="text-xs text-charcoal-light mt-1">
            Schedule a gentle check-in to keep yourself accountable to your garden ideas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem) => (
            <div
              key={rem.id}
              className="bg-white rounded-2xl border border-gray-green-border/60 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-ivory-warm flex items-center justify-center text-forest mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-charcoal">{rem.title}</h3>
                    {rem.projectTitle && (
                      <Badge variant="tech" size="sm">
                        {rem.projectTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-light mt-1 leading-relaxed">{rem.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-charcoal-light mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-forest" />
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
                  <button
                    onClick={() => cancelReminder(rem.id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-green-border text-xs text-charcoal-light hover:text-charcoal hover:bg-ivory-warm"
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={() => deleteReminder(rem.id)}
                  className="p-1.5 text-charcoal-light hover:text-rose"
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
            <label className="text-xs font-semibold text-charcoal-light block mb-1">
              Select Target Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
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
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-green-border bg-ivory"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-green-border bg-ivory"
              >
                <option value="once">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Delivery Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-green-border bg-ivory"
              >
                <option value="in-app">In-App Banner</option>
                <option value="email">Email Digest</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3.5 py-2 rounded-xl border text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
            >
              Set Reminder
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default RemindersPage;
