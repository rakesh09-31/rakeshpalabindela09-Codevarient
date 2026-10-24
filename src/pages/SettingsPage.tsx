import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Database,
  RotateCcw,
  Check,
  Save,
  AlertTriangle,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Avatar, Input, Textarea, ConfirmDialog, Github, Button } from '../components/ui';
import {
  getSupabaseConfigInfo,
  checkSupabaseConnection,
  type SupabaseConnectionResult,
} from '../services/supabaseClient';

export function SettingsPage() {
  const { userProfile, updateUserProfile, resetAllData } = useApp();

  const [name, setName] = useState(userProfile?.name || 'Alex Rivera');
  const [email, setEmail] = useState(userProfile?.email || 'alex.rivera@gardenofideas.dev');
  const [bio, setBio] = useState(
    userProfile?.bio ||
      'Full-stack builder passionate about climate tech, developer ergonomics, and digital gardening.'
  );
  const [skills, setSkills] = useState(userProfile?.skills?.join(', ') || 'React, TypeScript, Python');
  const [availability, setAvailability] = useState(userProfile?.availability || 'full-time');

  // Preferences
  const [notifUpdates, setNotifUpdates] = useState(userProfile?.notificationPrefs?.projectUpdates ?? true);
  const [notifAI, setNotifAI] = useState(userProfile?.notificationPrefs?.aiRecommendations ?? true);
  const [notifReminders, setNotifReminders] = useState(userProfile?.notificationPrefs?.reminders ?? true);
  const [notifTeam, setNotifTeam] = useState(userProfile?.notificationPrefs?.teamEvents ?? true);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Supabase connection state
  const supabaseInfo = getSupabaseConfigInfo();
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<SupabaseConnectionResult | null>(null);

  const handleTestSupabase = async () => {
    setIsCheckingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const result = await checkSupabaseConnection();
      setSupabaseTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to test connection';
      setSupabaseTestResult({
        success: false,
        configured: supabaseInfo.configured,
        message: 'Unexpected test error',
        errorDetails: msg,
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: name.trim(),
      email: email.trim(),
      bio: bio.trim(),
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      availability: availability as any,
      notificationPrefs: {
        projectUpdates: notifUpdates,
        aiRecommendations: notifAI,
        reminders: notifReminders,
        teamEvents: notifTeam,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold text-[var(--color-text)]  tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Settings & Profile
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-1">
          Manage your creator profile, notification channels, storage preferences, and demo environments.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 border border-[var(--color-border)] text-[var(--color-text)]  text-xs sm:text-sm rounded-2xl flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-[var(--color-text)] " /> Preferences saved successfully.
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] border-[var(--color-border)] pb-5">
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <div>
              <h2
                className="text-base font-bold text-[var(--color-text)] "
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {name}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]  font-mono">{email}</p>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
          >
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Textarea
          label="Bio / Creative Vision"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Key Skills (Comma-separated)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-muted)]  block mb-1.5 font-mono uppercase tracking-wider">
              Availability
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 cursor-pointer"
            >
              <option value="full-time">Full-Time Builder</option>
              <option value="part-time">Part-Time / Evenings</option>
              <option value="occasional">Occasional Contributor</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="pt-5 border-t border-[var(--color-border)] border-[var(--color-border)] space-y-3.5">
          <h3
            className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2 font-mono uppercase tracking-wider"
          >
            <Bell className="w-4 h-4 text-[var(--color-text)] " /> Notification Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] cursor-pointer text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={notifUpdates}
                onChange={(e) => setNotifUpdates(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-brand)] rounded cursor-pointer"
              />
              <span>Project Milestone Updates</span>
            </label>

            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] cursor-pointer text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={notifAI}
                onChange={(e) => setNotifAI(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-brand)] rounded cursor-pointer"
              />
              <span>AI Revival Recommendations</span>
            </label>

            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] cursor-pointer text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={notifReminders}
                onChange={(e) => setNotifReminders(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-brand)] rounded cursor-pointer"
              />
              <span>Upcoming Nudges & Reminders</span>
            </label>

            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] cursor-pointer text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={notifTeam}
                onChange={(e) => setNotifTeam(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-brand)] rounded cursor-pointer"
              />
              <span>Team & Contributor Events</span>
            </label>
          </div>
        </div>

        {/* Integrations */}
        <div className="pt-5 border-t border-[var(--color-border)] border-[var(--color-border)] space-y-3.5">
          <h3
            className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2 font-mono uppercase tracking-wider"
          >
            <Database className="w-4 h-4 text-[var(--color-text)] " /> Integrations & Local State
          </h3>

          <div className="space-y-2.5">
            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5 text-[var(--color-text)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">GitHub Connectivity</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Simulated local mock integration active</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                Connected
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[var(--color-text)]" />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text)] block">Local Persistence</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Preserving your garden state in SQLite / browser</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                Operational
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--color-text)] block">Supabase Cloud Backend</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {supabaseInfo.configured
                        ? `Connected to ${supabaseInfo.urlHost}`
                        : 'Unconfigured — Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md ${
                      supabaseInfo.configured
                        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                        : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {supabaseInfo.configured ? 'Configured' : 'Not Configured'}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isCheckingSupabase}
                    onClick={handleTestSupabase}
                    className="h-7 text-xs px-2.5"
                  >
                    {isCheckingSupabase ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Test Connection
                  </Button>
                </div>
              </div>

              {supabaseTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    supabaseTestResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {supabaseTestResult.success ? (
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div className="space-y-1">
                    <div className="font-semibold">{supabaseTestResult.message}</div>
                    {supabaseTestResult.errorDetails && (
                      <div className="text-[11px] opacity-80">{supabaseTestResult.errorDetails}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reset Danger Zone */}
        <div className="pt-5 border-t border-[var(--color-border)] space-y-3.5">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" /> Reset Demo Environment
          </h3>
          <div className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[var(--color-text)] block">Reset All Demo Data</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Restore the initial 6 projects, team, reminders, and clear custom modifications.
              </span>
            </div>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-seed Demo Data
            </Button>
          </div>
        </div>
      </form>

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetAllData();
          setShowResetConfirm(false);
          setSavedSuccess(true);
        }}
        title="Re-seed all data?"
        message="This will clear your local alterations and restore the pristine hackathon demo dataset."
        confirmLabel="Reset Everything"
        confirmVariant="danger"
      />
    </div>
  );
}

export default SettingsPage;
