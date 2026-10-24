import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Database,
  RotateCcw,
  Check,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Avatar, Input, Textarea, ConfirmDialog, Github } from '../components/ui';

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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-ivory-warm border border-gray-green-border flex items-center justify-center text-charcoal">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
            Settings & Profile
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-charcoal-light mt-1">
          Manage your creator profile, notification channels, storage preferences, and demo environments.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-mint-pale border border-mint text-forest text-xs sm:text-sm rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" /> Preferences saved successfully!
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-gray-green-border/60 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-green-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <div>
              <h2 className="text-base font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                {name}
              </h2>
              <p className="text-xs text-charcoal-light">{email}</p>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-light shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
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
            <label className="text-xs font-semibold text-charcoal-light block mb-1">
              Availability
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
            >
              <option value="full-time">Full-Time Builder</option>
              <option value="part-time">Part-Time / Evenings</option>
              <option value="occasional">Occasional Contributor</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="pt-4 border-t border-gray-green-border/40 space-y-3">
          <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
            <Bell className="w-4 h-4 text-forest" /> Notification Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-ivory border cursor-pointer">
              <input
                type="checkbox"
                checked={notifUpdates}
                onChange={(e) => setNotifUpdates(e.target.checked)}
                className="w-4 h-4 text-forest rounded"
              />
              <span>Project Milestone Updates</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-ivory border cursor-pointer">
              <input
                type="checkbox"
                checked={notifAI}
                onChange={(e) => setNotifAI(e.target.checked)}
                className="w-4 h-4 text-forest rounded"
              />
              <span>AI Revival Recommendations</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-ivory border cursor-pointer">
              <input
                type="checkbox"
                checked={notifReminders}
                onChange={(e) => setNotifReminders(e.target.checked)}
                className="w-4 h-4 text-forest rounded"
              />
              <span>Upcoming Nudges & Reminders</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-ivory border cursor-pointer">
              <input
                type="checkbox"
                checked={notifTeam}
                onChange={(e) => setNotifTeam(e.target.checked)}
                className="w-4 h-4 text-forest rounded"
              />
              <span>Team & Contributor Events</span>
            </label>
          </div>
        </div>

        {/* Integrations */}
        <div className="pt-4 border-t border-gray-green-border/40 space-y-3">
          <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
            <Database className="w-4 h-4 text-teal" /> Integrations & Local State
          </h3>

          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-ivory border border-gray-green-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Github className="w-5 h-5 text-charcoal" />
                <div>
                  <span className="text-xs font-bold text-charcoal block">GitHub Connectivity</span>
                  <span className="text-[11px] text-charcoal-light">Simulated local mock integration active</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-mint-pale text-forest">
                Connected
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory border border-gray-green-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-charcoal" />
                <div>
                  <span className="text-xs font-bold text-charcoal block">Local Persistence</span>
                  <span className="text-[11px] text-charcoal-light">Preserving your garden state in browser localStorage</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-mint-pale text-forest">
                Operational
              </span>
            </div>
          </div>
        </div>

        {/* Reset Danger Zone */}
        <div className="pt-4 border-t border-gray-green-border/40 space-y-3">
          <h3 className="text-sm font-bold text-rose flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose" /> Reset Demo Environment
          </h3>
          <div className="p-4 rounded-2xl bg-rose-light/20 border border-rose-light/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-rose block">Reset All Demo Data</span>
              <span className="text-[11px] text-charcoal-light">
                Restore the initial 6 projects, team, reminders, and clear custom modifications.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose text-white text-xs font-semibold hover:bg-rose/90 self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-seed Demo Data
            </button>
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
