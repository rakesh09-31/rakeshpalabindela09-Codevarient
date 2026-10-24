import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Clock,
  Trash2,
  Mail,
  Smartphone,
  Repeat,
  CheckCircle2,
  RotateCcw,
  X,
  Search,
  AlertCircle,
  CalendarClock,
  GripVertical,
  ArrowRight,
  XCircle,
  Sparkles,
  Calendar,
  AlertTriangle,
  History,
  RefreshCw,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  Reminder,
  ReminderCategory,
  ReminderPriority,
  ReminderChannel,
  NotificationSchedule,
  ReminderRecurrence,
  ReminderEvent,
  ReminderSuggestion,
  ProviderConfigStatus,
  ReminderStatus,
} from '../types';
import { Modal, Input, Textarea, Button, ConfirmDialog } from '../components/ui';
import { useLiveCountdown } from '../hooks/useLiveCountdown';
import { apiClient } from '../services/apiClient';

// Helper date classification functions
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  return isSameDay(d, new Date());
}

function isTomorrow(isoString: string): boolean {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(d, tomorrow);
}

function isThisWeek(isoString: string): boolean {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(now.getDate() + 7);
  return (
    d.getTime() > now.getTime() &&
    d.getTime() <= weekEnd.getTime() &&
    !isToday(isoString) &&
    !isTomorrow(isoString)
  );
}

function isLater(isoString: string): boolean {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(now.getDate() + 7);
  return d.getTime() > weekEnd.getTime();
}

// Live Countdown Badge subcomponent
function ReminderCountdownBadge({ dateTime, status }: { dateTime: string; status: ReminderStatus }) {
  const countdown = useLiveCountdown(dateTime);

  if (status === 'completed') {
    return (
      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
      </span>
    );
  }

  if (status === 'dismissed' || status === 'cancelled') {
    return (
      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-500/15 text-gray-400 border border-gray-500/30 flex items-center gap-1">
        <XCircle className="w-3.5 h-3.5" /> Dismissed
      </span>
    );
  }

  if (countdown.isOverdue) {
    return (
      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        {countdown.text}
      </span>
    );
  }

  if (countdown.isDueNow) {
    return (
      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        Due now
      </span>
    );
  }

  return (
    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-purple-400" />
      {countdown.text}
    </span>
  );
}

type TabType =
  | 'all'
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'this-week'
  | 'later'
  | 'completed'
  | 'dismissed'
  | 'history';

export function RemindersPage() {
  const {
    reminders,
    projects,
    createReminder,
    updateReminder,
    cancelReminder,
    completeReminder,
    snoozeReminder,
    restoreReminder,
    deleteReminder,
    refreshReminders,
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Provider Status
  const [providerStatus, setProviderStatus] = useState<ProviderConfigStatus>({
    email: {
      configured: false,
      provider: 'None',
      details: 'Email delivery not configured (set SMTP_HOST or RESEND_API_KEY)',
    },
    whatsapp: {
      configured: false,
      provider: 'None',
      details: 'WhatsApp delivery unavailable (set META_WHATSAPP_TOKEN or TWILIO_ACCOUNT_SID)',
    },
    inApp: {
      configured: true,
      provider: 'Browser & App Bell',
      details: 'Local notifications active',
    },
  });
  const [showProviderModal, setShowProviderModal] = useState(false);

  // History Events
  const [historyEvents, setHistoryEvents] = useState<ReminderEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // AI Suggestions
  const [suggestions, setSuggestions] = useState<ReminderSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(true);

  // The Canvas Protocol State
  const [pickedUpReminder, setPickedUpReminder] = useState<Reminder | null>(null);
  const [draggingReminder, setDraggingReminder] = useState<Reminder | null>(null);
  const [reminderActionFeedback, setReminderActionFeedback] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  // Modals & Popovers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeSnoozeId, setActiveSnoozeId] = useState<string | null>(null);
  const [customSnoozeDateTime, setCustomSnoozeDateTime] = useState('');
  const [showCustomSnoozeForId, setShowCustomSnoozeForId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'soonest' | 'latest' | 'priority' | 'created' | 'title'>('soonest');

  // Form States (Create & Edit)
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState<ReminderCategory>('continue-project');
  const [formPriority, setFormPriority] = useState<ReminderPriority>('medium');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formSchedule, setFormSchedule] = useState<NotificationSchedule>('at-due-time');
  const [formCustomLeadMinutes, setFormCustomLeadMinutes] = useState(30);
  const [formRecurrence, setFormRecurrence] = useState<ReminderRecurrence>('once');
  const [formCustomRecurrenceDays, setFormCustomRecurrenceDays] = useState(7);
  const [formChannels, setFormChannels] = useState<{ inApp: boolean; email: boolean; whatsapp: boolean }>({
    inApp: true,
    email: false,
    whatsapp: false,
  });
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formWhatsappConsent, setFormWhatsappConsent] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch initial provider status, refresh reminders & suggestions
  useEffect(() => {
    refreshReminders();
    apiClient
      .getReminderProviderStatus()
      .then((status) => setProviderStatus(status))
      .catch(() => {});
  }, [refreshReminders]);

  const loadSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const data = await apiClient.getAiReminderSuggestions();
      setSuggestions(data);
    } catch (e) {
      console.error('Failed to load AI suggestions:', e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Load audit history when switching to 'history' tab
  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoadingHistory(true);
      apiClient
        .getReminderHistory()
        .then((events) => setHistoryEvents(events))
        .catch(() => {})
        .finally(() => setIsLoadingHistory(false));
    }
  }, [activeTab]);

  // Tab counts
  const counts = useMemo(() => {
    const now = Date.now();
    let overdue = 0;
    let today = 0;
    let tomorrow = 0;
    let thisWeek = 0;
    let later = 0;
    let completed = 0;
    let dismissed = 0;

    reminders.forEach((r) => {
      if (r.status === 'completed') {
        completed++;
      } else if (r.status === 'dismissed' || r.status === 'cancelled') {
        dismissed++;
      } else if (r.status === 'upcoming') {
        const dueMs = new Date(r.dateTime).getTime();
        if (!isNaN(dueMs) && dueMs < now) {
          overdue++;
        } else if (isToday(r.dateTime)) {
          today++;
        } else if (isTomorrow(r.dateTime)) {
          tomorrow++;
        } else if (isThisWeek(r.dateTime)) {
          thisWeek++;
        } else {
          later++;
        }
      }
    });

    return {
      all: reminders.length,
      overdue,
      today,
      tomorrow,
      thisWeek,
      later,
      completed,
      dismissed,
      history: historyEvents.length,
    };
  }, [reminders, historyEvents]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = reminders.length;
    const completedCount = counts.completed;
    const overdueCount = counts.overdue;
    const todayCount = counts.today;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return {
      total,
      completed: completedCount,
      overdue: overdueCount,
      today: todayCount,
      completionRate,
    };
  }, [reminders, counts]);

  // Projects list
  const projectList = useMemo(() => {
    return projects.map((p) => ({ id: p.id, title: p.title }));
  }, [projects]);

  // Filtered & sorted reminders
  const filteredReminders = useMemo(() => {
    const now = Date.now();
    return reminders
      .filter((r) => {
        // Tab classification
        if (activeTab === 'overdue') {
          if (r.status !== 'upcoming') return false;
          const dueMs = new Date(r.dateTime).getTime();
          if (isNaN(dueMs) || dueMs >= now) return false;
        } else if (activeTab === 'today') {
          if (r.status !== 'upcoming') return false;
          if (!isToday(r.dateTime)) return false;
        } else if (activeTab === 'tomorrow') {
          if (r.status !== 'upcoming') return false;
          if (!isTomorrow(r.dateTime)) return false;
        } else if (activeTab === 'this-week') {
          if (r.status !== 'upcoming') return false;
          if (!isThisWeek(r.dateTime)) return false;
        } else if (activeTab === 'later') {
          if (r.status !== 'upcoming') return false;
          if (!isLater(r.dateTime)) return false;
        } else if (activeTab === 'completed') {
          if (r.status !== 'completed') return false;
        } else if (activeTab === 'dismissed') {
          if (r.status !== 'dismissed' && r.status !== 'cancelled') return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchNotes = r.message ? r.message.toLowerCase().includes(q) : false;
          const matchProj = r.projectTitle ? r.projectTitle.toLowerCase().includes(q) : false;
          const matchEmail = r.contactEmail ? r.contactEmail.toLowerCase().includes(q) : false;
          const matchPhone = r.contactPhone ? r.contactPhone.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchNotes && !matchProj && !matchEmail && !matchPhone) return false;
        }

        // Project filter
        if (selectedProject !== 'all' && r.projectId !== selectedProject) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && (r.category || 'continue-project') !== selectedCategory) {
          return false;
        }

        // Priority filter
        if (selectedPriority !== 'all' && (r.priority || 'medium') !== selectedPriority) {
          return false;
        }

        // Channel filter
        if (selectedChannel !== 'all') {
          const channels = r.channels || (r.channel === 'both' ? ['in-app', 'email'] : [r.channel || 'in-app']);
          if (!channels.includes(selectedChannel as ReminderChannel)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();

        const priorityScore: Record<ReminderPriority, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };

        if (sortBy === 'soonest') return timeA - timeB;
        if (sortBy === 'latest') return timeB - timeA;
        if (sortBy === 'priority') {
          return (priorityScore[b.priority || 'medium'] || 2) - (priorityScore[a.priority || 'medium'] || 2);
        }
        if (sortBy === 'created') return createdB - createdA;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [reminders, activeTab, searchQuery, selectedProject, selectedCategory, selectedPriority, selectedChannel, sortBy]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedProject !== 'all' ||
    selectedCategory !== 'all' ||
    selectedPriority !== 'all' ||
    selectedChannel !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProject('all');
    setSelectedCategory('all');
    setSelectedPriority('all');
    setSelectedChannel('all');
    setSortBy('soonest');
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingReminder(null);
    setFormProjectId(projects[0]?.id || '');
    setFormTitle('');
    setFormNotes('');
    setFormCategory('continue-project');
    setFormPriority('medium');

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    setFormDate(defaultDate.toISOString().split('T')[0]);
    setFormTime('09:00');

    setFormSchedule('at-due-time');
    setFormCustomLeadMinutes(30);
    setFormRecurrence('once');
    setFormCustomRecurrenceDays(7);
    setFormChannels({ inApp: true, email: false, whatsapp: false });
    setFormContactEmail('');
    setFormContactPhone('');
    setFormWhatsappConsent(false);
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (rem: Reminder) => {
    setEditingReminder(rem);
    setFormProjectId(rem.projectId || '');
    setFormTitle(rem.title);
    setFormNotes(rem.message || '');
    setFormCategory(rem.category || 'continue-project');
    setFormPriority(rem.priority || 'medium');

    const d = new Date(rem.dateTime);
    if (!isNaN(d.getTime())) {
      setFormDate(d.toISOString().split('T')[0]);
      setFormTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      setFormDate(defaultDate.toISOString().split('T')[0]);
      setFormTime('09:00');
    }

    setFormSchedule(rem.notificationSchedule || 'at-due-time');
    setFormCustomLeadMinutes(rem.customLeadTimeMinutes || 30);
    setFormRecurrence(rem.recurrence || 'once');
    setFormCustomRecurrenceDays(rem.customRecurrenceDays || 7);

    const channels = rem.channels || (rem.channel === 'both' ? ['in-app', 'email'] : [rem.channel || 'in-app']);
    setFormChannels({
      inApp: channels.includes('in-app'),
      email: channels.includes('email'),
      whatsapp: channels.includes('whatsapp'),
    });

    setFormContactEmail(rem.contactEmail || '');
    setFormContactPhone(rem.contactPhone || '');
    setFormWhatsappConsent(rem.whatsappConsent || false);
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Open Modal populated from AI Suggestion
  const openSuggestionModal = (sug: ReminderSuggestion) => {
    setEditingReminder(null);
    setFormProjectId(sug.projectId || '');
    setFormTitle(sug.suggestedTitle || sug.title || '');
    setFormNotes(sug.suggestedDescription || sug.message || sug.rationale);
    setFormCategory(sug.suggestedCategory || sug.category || 'continue-project');
    setFormPriority(sug.suggestedPriority || sug.priority || 'medium');

    const sugDate = sug.suggestedDateTime ? new Date(sug.suggestedDateTime) : new Date(Date.now() + (sug.suggestedDueOffsetHours || 24) * 3600000);
    if (!isNaN(sugDate.getTime())) {
      setFormDate(sugDate.toISOString().split('T')[0]);
      setFormTime(
        `${String(sugDate.getHours()).padStart(2, '0')}:${String(sugDate.getMinutes()).padStart(2, '0')}`
      );
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 2);
      setFormDate(defaultDate.toISOString().split('T')[0]);
      setFormTime('10:00');
    }

    setFormSchedule('at-due-time');
    setFormCustomLeadMinutes(30);
    setFormRecurrence('once');
    setFormCustomRecurrenceDays(7);
    setFormChannels({ inApp: true, email: false, whatsapp: false });
    setFormContactEmail('');
    setFormContactPhone('');
    setFormWhatsappConsent(false);
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Validate form in real time
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formTitle.trim()) {
      errors.title = 'Reminder title is required.';
    }

    if (!formDate) {
      errors.date = 'Due date is required.';
    }

    const selectedChannelsList: ReminderChannel[] = [];
    if (formChannels.inApp) selectedChannelsList.push('in-app');
    if (formChannels.email) selectedChannelsList.push('email');
    if (formChannels.whatsapp) selectedChannelsList.push('whatsapp');

    if (selectedChannelsList.length === 0) {
      errors.channels = 'Select at least one delivery channel.';
    }

    // Email validation
    if (formChannels.email) {
      if (!formContactEmail.trim()) {
        errors.email = 'Contact email is required when email delivery is selected.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formContactEmail.trim())) {
        errors.email = 'Please provide a valid email address (e.g. user@example.com).';
      }
    }

    // WhatsApp validation
    if (formChannels.whatsapp) {
      if (!formContactPhone.trim()) {
        errors.phone = 'Phone number is required when WhatsApp delivery is selected.';
      } else if (!/^\+[1-9]\d{6,14}$/.test(formContactPhone.trim())) {
        errors.phone =
          'Phone number must be in E.164 international format with country code (e.g. +14155552671).';
      }

      if (!formWhatsappConsent) {
        errors.consent = 'You must give explicit consent to receive WhatsApp reminders.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const [hours, minutes] = formTime.split(':').map(Number);
    const dueDateTime = new Date(formDate);
    dueDateTime.setHours(hours || 9, minutes || 0, 0, 0);
    const dueIso = dueDateTime.toISOString();

    const selectedChannelsList: ReminderChannel[] = [];
    if (formChannels.inApp) selectedChannelsList.push('in-app');
    if (formChannels.email) selectedChannelsList.push('email');
    if (formChannels.whatsapp) selectedChannelsList.push('whatsapp');

    const targetProject = projects.find((p) => p.id === formProjectId);

    const payload = {
      projectId: targetProject?.id,
      projectTitle: targetProject?.title,
      title: formTitle.trim(),
      message: formNotes.trim() || 'Check in on project progress',
      dateTime: dueIso,
      category: formCategory,
      priority: formPriority,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      channels: selectedChannelsList,
      channel:
        selectedChannelsList.includes('email') && selectedChannelsList.includes('in-app')
          ? ('both' as const)
          : selectedChannelsList.includes('email')
          ? ('email' as const)
          : ('in-app' as const),
      contactEmail: formChannels.email ? formContactEmail.trim() : undefined,
      contactPhone: formChannels.whatsapp ? formContactPhone.trim() : undefined,
      whatsappConsent: formChannels.whatsapp ? formWhatsappConsent : false,
      whatsappConsentTimestamp:
        formChannels.whatsapp && formWhatsappConsent ? new Date().toISOString() : undefined,
      notificationSchedule: formSchedule,
      customLeadTimeMinutes: formSchedule === 'custom' ? formCustomLeadMinutes : undefined,
      recurrence: formRecurrence,
      customRecurrenceDays: formRecurrence === 'custom' ? formCustomRecurrenceDays : undefined,
      enabled: true,
    };

    if (editingReminder) {
      updateReminder(editingReminder.id, payload);
      setReminderActionFeedback({
        type: 'success',
        message: `Updated reminder: "${payload.title}"`,
      });
    } else {
      createReminder(payload);
      setReminderActionFeedback({
        type: 'success',
        message: `Scheduled reminder: "${payload.title}"`,
      });
    }

    setShowCreateModal(false);
  };

  // Snooze Actions
  const handleQuickSnooze = (id: string, hours: number, minutes?: number) => {
    snoozeReminder(id, hours, minutes);
    setActiveSnoozeId(null);
    setShowCustomSnoozeForId(null);
    const rem = reminders.find((r) => r.id === id);
    setReminderActionFeedback({
      type: 'info',
      message: `Snoozed reminder "${rem?.title || id}" for ${
        minutes ? `${minutes} minutes` : `${hours} hours`
      }`,
    });
  };

  const handleCustomSnooze = (id: string) => {
    if (!customSnoozeDateTime) return;
    snoozeReminder(id, undefined, undefined, new Date(customSnoozeDateTime).toISOString());
    setActiveSnoozeId(null);
    setShowCustomSnoozeForId(null);
    setCustomSnoozeDateTime('');
    const rem = reminders.find((r) => r.id === id);
    setReminderActionFeedback({
      type: 'info',
      message: `Rescheduled reminder "${rem?.title || id}" to ${new Date(
        customSnoozeDateTime
      ).toLocaleString()}`,
    });
  };

  // Canvas Protocol Completion
  const executeComplete = (id: string) => {
    completeReminder(id);
    const rem = reminders.find((r) => r.id === id);
    setReminderActionFeedback({
      type: 'success',
      message: `Completed reminder: "${rem?.title || id}"`,
    });
    setPickedUpReminder(null);
    setDraggingReminder(null);
  };

  // Canvas Protocol Dismissal
  const executeDismiss = (id: string) => {
    cancelReminder(id);
    const rem = reminders.find((r) => r.id === id);
    setReminderActionFeedback({
      type: 'info',
      message: `Dismissed reminder: "${rem?.title || id}"`,
    });
    setPickedUpReminder(null);
    setDraggingReminder(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4568DC] via-[#8B2FE8] to-[#C026D3] text-white shadow-[0_0_18px_rgba(139,47,232,0.4)] flex items-center justify-center shrink-0 border border-white/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Project Follow-through Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Reliable Pulses
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-body)] mt-1">
                Keep dormant ideas from slipping away. Schedule nudges, monitor automated pulses, and stay accountable to your garden projects.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {/* Provider Status Pill */}
          <button
            type="button"
            onClick={() => setShowProviderModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title="Inspect Notification Delivery Services"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Delivery Services</span>
            <span
              className={`w-2 h-2 rounded-full ${
                providerStatus.email.configured || providerStatus.whatsapp.configured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-[0_0_14px_rgba(139,47,232,0.35)]"
          >
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block uppercase tracking-wider">
            Total Reminders
          </span>
          <div className="text-2xl font-bold text-[var(--color-text)] mt-1 font-mono">
            {metrics.total}
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
            Across all project gardens
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block uppercase tracking-wider">
            Due Today
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
            {metrics.today}
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
            Immediate check-ins
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block uppercase tracking-wider">
            Overdue
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
            {metrics.overdue}
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
            Needs attention or snooze
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block uppercase tracking-wider">
            Completed
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {metrics.completed}
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
            Followed through
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block uppercase tracking-wider">
            Completion Rate
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
            {metrics.completionRate}%
          </div>
          <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Grounded Suggestions Banner */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/15 dark:bg-[#1C1428] p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">
                AI Follow-through Suggestions ({suggestions.length})
              </h2>
              <span className="text-[11px] text-[var(--color-text-muted)] hidden sm:inline">
                Grounded in your real project blockers and milestones
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSuggestions}
                disabled={isLoadingSuggestions}
                className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Refresh Suggestions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setShowSuggestionsPanel((prev) => !prev)}
                className="text-xs text-purple-300 hover:text-white px-2 py-1 rounded-md hover:bg-purple-500/20 transition-colors cursor-pointer"
              >
                {showSuggestionsPanel ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {showSuggestionsPanel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3.5">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="rounded-xl border border-purple-500/20 bg-[var(--color-surface)] p-3.5 flex flex-col justify-between gap-3 shadow-xs hover:border-purple-500/40 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold uppercase">
                        {(sug.suggestedCategory || sug.category || 'continue-project').replace('-', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase ${
                          (sug.suggestedPriority || sug.priority) === 'urgent'
                            ? 'text-rose-400'
                            : (sug.suggestedPriority || sug.priority) === 'high'
                            ? 'text-amber-400'
                            : 'text-purple-300'
                        }`}
                      >
                        {sug.suggestedPriority || sug.priority || 'medium'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)] leading-snug">
                      {sug.suggestedTitle || sug.title}
                    </h4>

                    <div className="text-[11px] font-mono text-purple-400">
                      {sug.projectTitle}
                    </div>

                    <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed italic">
                      "{sug.rationale}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      Suggested for {sug.suggestedDateTime ? new Date(sug.suggestedDateTime).toLocaleDateString() : `+${sug.suggestedDueOffsetHours || 24}h`}
                    </span>
                    <button
                      type="button"
                      onClick={() => openSuggestionModal(sug)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'overdue', label: 'Overdue', count: counts.overdue, alert: counts.overdue > 0 },
          { id: 'today', label: 'Due Today', count: counts.today },
          { id: 'tomorrow', label: 'Tomorrow', count: counts.tomorrow },
          { id: 'this-week', label: 'This Week', count: counts.thisWeek },
          { id: 'later', label: 'Later', count: counts.later },
          { id: 'completed', label: 'Completed', count: counts.completed },
          { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
          { id: 'history', label: 'Audit History', count: counts.history },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setActiveSnoozeId(null);
                setShowCustomSnoozeForId(null);
              }}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer select-none border ${
                isActive
                  ? 'bg-gradient-to-r from-[#8B2FE8] to-[#C026D3] text-white font-semibold border-transparent shadow-[0_0_12px_rgba(139,47,232,0.3)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : tab.alert
                    ? 'bg-rose-500/20 text-rose-400 font-bold'
                    : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar (Only for reminder list tabs) */}
      {activeTab !== 'history' && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, checklist, project, email, phone..."
                className="w-full h-[38px] pl-10 pr-9 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-focus)] transition-colors"
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

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Project Filter */}
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="h-[38px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                    {p.title}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-[38px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="continue-project">Continue Project</option>
                <option value="finish-task">Finish Task</option>
                <option value="review">Review</option>
                <option value="deadline">Deadline</option>
                <option value="follow-up">Follow-up</option>
              </select>

              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="h-[38px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Channel Filter */}
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="h-[38px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Channels</option>
                <option value="in-app">In-App</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-[38px] text-xs px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none cursor-pointer"
              >
                <option value="soonest">Soonest Due</option>
                <option value="latest">Latest Due</option>
                <option value="priority">Priority Order</option>
                <option value="created">Recently Added</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-[38px] px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* The Canvas Protocol: Action Zones Dock */}
      {activeTab !== 'history' && activeTab !== 'completed' && activeTab !== 'dismissed' && (
        <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-[var(--color-surface-subtle)] dark:bg-[#17131F] border border-[var(--color-border)] dark:border-[#382B49] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                The Canvas Protocol
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                Reminder Action Dock
              </h2>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
              Drag reminder cards into Complete or Dismiss zones
            </span>
          </div>

          {reminderActionFeedback && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                reminderActionFeedback.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-950/30 border-blue-500/40 text-blue-300'
              }`}
            >
              <span>{reminderActionFeedback.message}</span>
              <button
                type="button"
                onClick={() => setReminderActionFeedback(null)}
                className="text-[10px] text-white/60 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Complete Zone */}
            <div
              data-drop-zone="complete-reminder"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) executeComplete(id);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && pickedUpReminder) {
                  e.preventDefault();
                  executeComplete(pickedUpReminder.id);
                }
              }}
              role="region"
              aria-label="Complete Reminder Zone. Drop reminder here to mark completed."
              className={`p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between select-none ${
                draggingReminder || pickedUpReminder
                  ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                  : 'bg-[var(--color-surface)] dark:bg-[#120F18] border-[var(--color-border)] dark:border-[#382B49]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                    Complete Reminder Zone
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Drop reminder card here to resolve (advances recurring reminders)
                  </p>
                </div>
              </div>

              {pickedUpReminder && (
                <button
                  type="button"
                  onClick={() => executeComplete(pickedUpReminder.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>Drop Here</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dismiss Zone */}
            <div
              data-drop-zone="dismiss-reminder"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) executeDismiss(id);
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && pickedUpReminder) {
                  e.preventDefault();
                  executeDismiss(pickedUpReminder.id);
                }
              }}
              role="region"
              aria-label="Dismiss Reminder Zone. Drop reminder here to dismiss."
              className={`p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-between select-none ${
                draggingReminder || pickedUpReminder
                  ? 'bg-rose-950/20 border-rose-500 ring-2 ring-rose-500/30 shadow-md'
                  : 'bg-[var(--color-surface)] dark:bg-[#120F18] border-[var(--color-border)] dark:border-[#382B49]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                    Dismiss Reminder Zone
                  </h4>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Drop reminder card here to cancel scheduled nudges
                  </p>
                </div>
              </div>

              {pickedUpReminder && (
                <button
                  type="button"
                  onClick={() => executeDismiss(pickedUpReminder.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>Drop Here</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === 'history' ? (
        /* Audit History Timeline View */
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-[var(--color-text)]">
                Reminder Audit & Delivery History
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoadingHistory(true);
                apiClient
                  .getReminderHistory()
                  .then((events) => setHistoryEvents(events))
                  .catch(() => {})
                  .finally(() => setIsLoadingHistory(false));
              }}
              className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-secondary)]">
              Loading audit timeline...
            </div>
          ) : historyEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-secondary)] space-y-1">
              <CalendarClock className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
              <p>No audit events recorded yet.</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Creating, completing, snoozing, and delivering reminders generates audit records here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start gap-3 text-xs"
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      ev.eventType === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : ev.eventType === 'snoozed'
                        ? 'bg-amber-500/20 text-amber-400'
                        : ev.eventType === 'dismissed'
                        ? 'bg-rose-500/20 text-rose-400'
                        : ev.eventType === 'notification_sent' || ev.eventType === 'dispatched'
                        ? 'bg-blue-500/20 text-blue-400'
                        : ev.eventType === 'notification_failed' || ev.eventType === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {ev.eventType === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : ev.eventType === 'snoozed' ? (
                      <Clock className="w-4 h-4" />
                    ) : ev.eventType === 'dismissed' ? (
                      <XCircle className="w-4 h-4" />
                    ) : ev.eventType === 'notification_sent' || ev.eventType === 'dispatched' ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--color-text)] capitalize">
                        {ev.eventType.replace('-', ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed">
                      {ev.details}
                    </p>
                    {ev.channel && (
                      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] uppercase">
                        via {ev.channel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredReminders.length === 0 ? (
        /* Empty State */
        <div className="bg-[var(--color-surface)] rounded-3xl border border-dashed border-[var(--color-border)] p-12 text-center shadow-xs space-y-3">
          <CalendarClock className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-bold text-[var(--color-text)]">
            No reminders found in "{activeTab.replace('-', ' ')}"
          </h3>
          <p className="text-xs text-[var(--color-text-body)] max-w-sm mx-auto leading-relaxed">
            {activeTab === 'all' || activeTab === 'today' || activeTab === 'overdue'
              ? 'Schedule a gentle check-in or milestone audit to keep yourself accountable to your garden ideas.'
              : activeTab === 'completed'
              ? 'When you check off milestone nudges and resolve blockers, they will appear here.'
              : 'Dismissed nudges are archived here so you can restore them anytime.'}
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4" /> Schedule Reminder
            </Button>
          </div>
        </div>
      ) : (
        /* Reminders Card List */
        <div className="space-y-3">
          {filteredReminders.map((rem) => {
            const dueDate = new Date(rem.dateTime);
            const formattedDate = !isNaN(dueDate.getTime())
              ? dueDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Flexible date';

            const channels =
              rem.channels || (rem.channel === 'both' ? ['in-app', 'email'] : [rem.channel || 'in-app']);

            const priorityBadgeColors: Record<ReminderPriority, string> = {
              urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
              high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
              medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
              low: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
            };

            const isActionable = rem.status === 'upcoming';

            return (
              <div
                key={rem.id}
                draggable={isActionable}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', rem.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                  setDraggingReminder(rem);
                }}
                onDragEnd={() => setDraggingReminder(null)}
                tabIndex={isActionable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isActionable && (e.key === ' ' || e.key === 'Enter')) {
                    e.preventDefault();
                    setPickedUpReminder((prev) => (prev?.id === rem.id ? null : rem));
                  }
                }}
                className={`bg-[var(--color-surface)] rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                  pickedUpReminder?.id === rem.id
                    ? 'border-purple-500 ring-2 ring-purple-500/40 shadow-lg scale-[1.01]'
                    : draggingReminder?.id === rem.id
                    ? 'opacity-40 border-dashed border-purple-400'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                {/* Left Section: Drag handle + Details */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Action Icon / Drag Handle */}
                  {isActionable ? (
                    <div
                      className="mt-0.5 text-purple-400 p-1 rounded-md cursor-grab active:cursor-grabbing hover:bg-purple-500/10 transition-colors shrink-0 flex items-center justify-center"
                      title="Drag to Complete or Dismiss Zone"
                    >
                      <GripVertical className="w-5 h-5" />
                    </div>
                  ) : rem.status === 'completed' ? (
                    <div className="mt-0.5 text-[#34D399] shrink-0" title="Completed">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[var(--color-text-muted)] shrink-0" title="Dismissed">
                      <AlertCircle className="w-5 h-5 opacity-60" />
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Badges row: Countdown + Category + Priority + Project */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Live Persistent Countdown Timer */}
                      <ReminderCountdownBadge dateTime={rem.dateTime} status={rem.status} />

                      {/* Category Badge */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)] uppercase">
                        {(rem.category || 'continue-project').replace('-', ' ')}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                          priorityBadgeColors[rem.priority || 'medium']
                        }`}
                      >
                        {rem.priority || 'medium'}
                      </span>

                      {/* Project Link */}
                      {rem.projectTitle && (
                        <Link
                          to={rem.projectId ? `/projects/${rem.projectId}` : '#'}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 hover:text-white border border-purple-500/20 font-medium transition-colors"
                          onClick={(e) => !rem.projectId && e.preventDefault()}
                        >
                          <span>{rem.projectTitle}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Link>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`text-sm sm:text-base font-bold text-[var(--color-text)] tracking-tight ${
                        rem.status === 'completed' ? 'line-through opacity-70' : ''
                      }`}
                    >
                      {rem.title}
                    </h3>

                    {/* Notes / Checklist */}
                    {rem.message && (
                      <p className="text-xs sm:text-sm text-[var(--color-text-body)] leading-relaxed">
                        {rem.message}
                      </p>
                    )}

                    {/* Delivery & Schedule Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1.5 text-[var(--color-text-body)]">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        {formattedDate}
                      </span>

                      <span className="flex items-center gap-1 capitalize">
                        <Repeat className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />{' '}
                        {rem.recurrence === 'custom'
                          ? `Every ${rem.customRecurrenceDays || 7} days`
                          : rem.recurrence || 'once'}
                      </span>

                      {/* Delivery Channels Pills with Destination Tooltip */}
                      <div className="flex items-center gap-1.5">
                        {channels.map((ch) => (
                          <span
                            key={ch}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)] text-[10px]"
                            title={
                              ch === 'email'
                                ? `Email destination: ${rem.contactEmail || 'Not specified'}`
                                : ch === 'whatsapp'
                                ? `WhatsApp destination: ${rem.contactPhone || 'Not specified'}`
                                : 'In-app notification'
                            }
                          >
                            {ch === 'email' ? (
                              <Mail className="w-3 h-3 text-blue-400" />
                            ) : ch === 'whatsapp' ? (
                              <Smartphone className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Bell className="w-3 h-3 text-purple-400" />
                            )}
                            <span className="capitalize">{ch}</span>
                          </span>
                        ))}
                      </div>

                      {/* Snooze Count Indicator */}
                      {rem.snoozeCount && rem.snoozeCount > 0 && (
                        <span className="text-[10px] text-amber-400 font-mono">
                          Snoozed {rem.snoozeCount}×
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--color-border)]/40 w-full md:w-auto justify-end">
                  {isActionable && (
                    <>
                      {/* Snooze Menu */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveSnoozeId(activeSnoozeId === rem.id ? null : rem.id);
                            setShowCustomSnoozeForId(null);
                          }}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                        >
                          <Clock className="w-3.5 h-3.5" /> Snooze
                        </Button>

                        {activeSnoozeId === rem.id && (
                          <div className="absolute right-0 top-9 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-popover)] py-1.5 z-20 text-xs">
                            <button
                              onClick={() => handleQuickSnooze(rem.id, 0, 10)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              +10 Minutes
                            </button>
                            <button
                              onClick={() => handleQuickSnooze(rem.id, 1)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              +1 Hour
                            </button>
                            <button
                              onClick={() => handleQuickSnooze(rem.id, 24)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              Tomorrow (+24h)
                            </button>
                            <button
                              onClick={() => handleQuickSnooze(rem.id, 168)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-pointer"
                            >
                              Next Week (+7d)
                            </button>
                            <div className="border-t border-[var(--color-border)] my-1" />
                            <button
                              onClick={() => setShowCustomSnoozeForId(rem.id)}
                              className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--color-surface-hover)] text-purple-400 font-medium cursor-pointer"
                            >
                              Custom Date & Time...
                            </button>

                            {showCustomSnoozeForId === rem.id && (
                              <div className="p-2 border-t border-[var(--color-border)] space-y-2">
                                <input
                                  type="datetime-local"
                                  value={customSnoozeDateTime}
                                  onChange={(e) => setCustomSnoozeDateTime(e.target.value)}
                                  className="w-full text-[10px] p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCustomSnooze(rem.id)}
                                  className="w-full py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Apply Snooze
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(rem)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer"
                        title="Edit Reminder"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* The Canvas Protocol: Accessible Pick Up Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          if (pickedUpReminder?.id === rem.id) {
                            setPickedUpReminder(null);
                          } else {
                            setPickedUpReminder(rem);
                            setReminderActionFeedback({
                              type: 'info',
                              message: `Selected reminder: "${rem.title}". Drop in Complete or Dismiss Zone above.`,
                            });
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium border cursor-pointer ${
                          pickedUpReminder?.id === rem.id
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-purple-500/40'
                        }`}
                      >
                        {pickedUpReminder?.id === rem.id ? 'Holding Reminder' : 'Pick Up'}
                      </button>
                    </>
                  )}

                  {!isActionable && (
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
                    className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-lg hover:bg-[var(--color-surface-hover)]"
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

      {/* Provider Status Modal */}
      <Modal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        title="Scheduled Notification Delivery Status"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            The Follow-through Center features real background schedulers and honest provider inspection.
            When an external provider is unconfigured, delivery failures are recorded accurately without simulating delivery.
          </p>

          <div className="space-y-2.5">
            {/* In-App */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-semibold text-[var(--color-text)]">In-App Notification</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    Local web notifications and application bell
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                Active
              </span>
            </div>

            {/* Email */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-semibold text-[var(--color-text)]">Email Reminders</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    {providerStatus.email.configured
                      ? `Provider: ${providerStatus.email.provider}`
                      : providerStatus.email.details}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                  providerStatus.email.configured
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {providerStatus.email.configured ? 'Configured' : 'Not Configured'}
              </span>
            </div>

            {/* WhatsApp */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-[var(--color-text)]">WhatsApp Reminders</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    {providerStatus.whatsapp.configured
                      ? `Provider: ${providerStatus.whatsapp.provider}`
                      : providerStatus.whatsapp.details}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                  providerStatus.whatsapp.configured
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {providerStatus.whatsapp.configured ? 'Configured' : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
            <Button variant="primary" size="sm" onClick={() => setShowProviderModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule / Edit Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingReminder ? 'Edit Follow-through Reminder' : 'Schedule Follow-through Reminder'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Target Project */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
              Linked Garden Project
            </label>
            <select
              value={formProjectId}
              onChange={(e) => setFormProjectId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
            >
              <option value="">No linked project (General reminder)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Reminder Title */}
          <div>
            <Input
              label="Reminder Title *"
              required
              value={formTitle}
              onChange={(e) => {
                setFormTitle(e.target.value);
                if (formErrors.title) {
                  setFormErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
              placeholder="e.g. Re-evaluate local Llama 3 inference latency"
            />
            {formErrors.title && (
              <p className="text-[11px] text-rose-400 mt-1">{formErrors.title}</p>
            )}
          </div>

          {/* Notes / Action Checklist */}
          <Textarea
            label="Notes / Action Checklist"
            rows={2}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="What exact blocker, milestone, or pull request should be reviewed?"
          />

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ReminderCategory)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="continue-project">Continue Project</option>
                <option value="finish-task">Finish Task</option>
                <option value="review">Review</option>
                <option value="deadline">Deadline</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Priority
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as ReminderPriority)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Date, Time & Notification Schedule Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)]"
              />
              {formErrors.date && (
                <p className="text-[11px] text-rose-400 mt-1">{formErrors.date}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Due Time (Local)
              </label>
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Notification Schedule
              </label>
              <select
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value as NotificationSchedule)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="at-time">At Due Time</option>
                <option value="10m-before">10 Minutes Before</option>
                <option value="1h-before">1 Hour Before</option>
                <option value="1d-before">1 Day Before</option>
                <option value="custom">Custom Lead Time</option>
              </select>
            </div>
          </div>

          {/* Custom Lead Time Input */}
          {formSchedule === 'custom' && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Custom Lead Time (Minutes Before Due Date)
              </label>
              <input
                type="number"
                min="1"
                max="10080"
                value={formCustomLeadMinutes}
                onChange={(e) => setFormCustomLeadMinutes(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)]"
              />
            </div>
          )}

          {/* Recurrence Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                Recurrence Rule
              </label>
              <select
                value={formRecurrence}
                onChange={(e) => setFormRecurrence(e.target.value as ReminderRecurrence)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
              >
                <option value="once">Once (Does not repeat)</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom interval</option>
              </select>
            </div>

            {formRecurrence === 'custom' && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 font-mono uppercase tracking-wider">
                  Repeat Interval (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formCustomRecurrenceDays}
                  onChange={(e) => setFormCustomRecurrenceDays(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)]"
                />
              </div>
            )}
          </div>

          {/* Delivery Channels */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] block font-mono uppercase tracking-wider">
              Delivery Channels
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* In-App */}
              <label className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center gap-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)]">
                <input
                  type="checkbox"
                  checked={formChannels.inApp}
                  onChange={(e) => setFormChannels((prev) => ({ ...prev, inApp: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <Bell className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-[var(--color-text)]">In-App Notification</span>
              </label>

              {/* Email */}
              <label className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center gap-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)]">
                <input
                  type="checkbox"
                  checked={formChannels.email}
                  onChange={(e) => setFormChannels((prev) => ({ ...prev, email: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-[var(--color-text)]">Email Reminder</span>
              </label>

              {/* WhatsApp */}
              <label className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center gap-2.5 cursor-pointer hover:bg-[var(--color-surface-hover)]">
                <input
                  type="checkbox"
                  checked={formChannels.whatsapp}
                  onChange={(e) => setFormChannels((prev) => ({ ...prev, whatsapp: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-[var(--color-text)]">WhatsApp Pulse</span>
              </label>
            </div>
            {formErrors.channels && (
              <p className="text-[11px] text-rose-400">{formErrors.channels}</p>
            )}
          </div>

          {/* Dynamic Email Contact Field */}
          {formChannels.email && (
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/15 space-y-2">
              <label className="text-xs font-semibold text-blue-300 block font-mono uppercase tracking-wider">
                Destination Email *
              </label>
              <input
                type="email"
                required
                value={formContactEmail}
                onChange={(e) => {
                  setFormContactEmail(e.target.value);
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="developer@example.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-blue-400"
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-400">{formErrors.email}</p>
              )}
              {formContactEmail && !formErrors.email && (
                <p className="text-[11px] text-blue-300 font-mono">
                  Email reminder will be sent to: <span className="underline">{formContactEmail}</span>
                </p>
              )}
            </div>
          )}

          {/* Dynamic WhatsApp Contact Field & Mandatory Consent */}
          {formChannels.whatsapp && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-2.5">
              <label className="text-xs font-semibold text-emerald-300 block font-mono uppercase tracking-wider">
                Destination WhatsApp Phone Number (E.164 Format) *
              </label>
              <input
                type="tel"
                required
                value={formContactPhone}
                onChange={(e) => {
                  setFormContactPhone(e.target.value);
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="+14155552671"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-text)] focus:outline-none focus:border-emerald-400"
              />
              {formErrors.phone && (
                <p className="text-[11px] text-rose-400">{formErrors.phone}</p>
              )}
              {formContactPhone && !formErrors.phone && (
                <p className="text-[11px] text-emerald-300 font-mono">
                  WhatsApp message will be sent to: <span className="underline">{formContactPhone}</span>
                </p>
              )}

              {/* Explicit Consent Checkbox */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formWhatsappConsent}
                  onChange={(e) => {
                    setFormWhatsappConsent(e.target.checked);
                    if (formErrors.consent) setFormErrors((prev) => ({ ...prev, consent: '' }));
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  I agree to receive project follow-through reminders and deadline pulses via WhatsApp at this number.
                </span>
              </label>
              {formErrors.consent && (
                <p className="text-[11px] text-rose-400">{formErrors.consent}</p>
              )}
            </div>
          )}

          {/* Form Actions */}
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
              {editingReminder ? 'Save Changes' : 'Schedule Reminder'}
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
            setReminderActionFeedback({
              type: 'info',
              message: 'Reminder deleted permanently.',
            });
          }
        }}
        title="Delete Reminder"
        message="Are you sure you want to permanently remove this reminder and its background scheduled jobs? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

export default RemindersPage;
