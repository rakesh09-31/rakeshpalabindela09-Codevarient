import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Check,
  X,
  UserPlus,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TeamMember } from '../types';
import { Avatar, Modal, Input, Textarea, ConfirmDialog, Button } from '../components/ui';

export function TeamsPage() {
  const {
    teams,
    projects,
    createTeam,
    approveJoinRequest,
    rejectJoinRequest,
    removeMember,
  } = useApp();
  const navigate = useNavigate();

  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0]?.id || '');
  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  // Modals
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<TeamMember | null>(null);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSkills, setInviteSkills] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    const created = createTeam(teamName.trim(), teamDesc.trim());
    setActiveTeamId(created.id);
    setTeamName('');
    setTeamDesc('');
    setShowCreateTeamModal(false);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !activeTeam) return;
    activeTeam.members.push({
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      role: inviteRole,
      skills: inviteSkills.split(',').map((s) => s.trim()).filter(Boolean),
      availability: 'part-time',
      joinedAt: new Date().toISOString(),
    });
    setInviteName('');
    setInviteSkills('');
    setShowInviteModal(false);
  };

  const associatedProjects = projects.filter((p) =>
    activeTeam?.projectIds.includes(p.id)
  );

  const pendingRequests = activeTeam?.joinRequests.filter((r) => r.status === 'pending') || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[var(--color-text)]  tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Teams & Collaboration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]  mt-1">
            Build together. Form collectives, share project stewardship, and review contributor applications.
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateTeamModal(true)}
          >
            <Plus className="w-4 h-4" /> Create Team
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      {!activeTeam ? (
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-[var(--color-text-secondary)]  mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)] ">No teams formed yet</h3>
          <p className="text-xs text-[var(--color-text-muted)]  mb-4 max-w-sm mx-auto">
            Create your first collective to invite collaborators.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateTeamModal(true)}
          >
            Create Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Team Info & Members */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Overview Card */}
            <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand)] text-white dark:bg-[var(--color-surface-subtle)]  flex items-center justify-center text-lg font-mono font-bold shadow-xs">
                    {activeTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold text-[var(--color-text)]  tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {activeTeam.name}
                    </h2>
                    <p className="text-xs font-mono text-[var(--color-text-muted)] ">
                      {activeTeam.members.length} active members
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  className="self-start sm:self-center"
                >
                  <UserPlus className="w-4 h-4" /> Invite Contributor
                </Button>
              </div>

              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]  leading-relaxed">
                {activeTeam.description}
              </p>
            </div>

            {/* Pending Join Requests Queue */}
            {pendingRequests.length > 0 && (
              <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2 font-mono uppercase tracking-wider"
                  >
                    <UserPlus className="w-4 h-4" /> Pending Join Requests ({pendingRequests.length})
                  </h3>
                  <span className="text-[11px] text-[var(--color-text-muted)] font-mono">Review & onboard collaborators</span>
                </div>

                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={req.userName} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[var(--color-text)] ">{req.userName}</span>
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                              applied {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)]  italic mt-0.5">"{req.message}"</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {req.skills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text)]  border border-[var(--color-border)]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => approveJoinRequest(activeTeam.id, req.id)}
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectJoinRequest(activeTeam.id, req.id)}
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 md:p-7 space-y-4 shadow-xs">
              <h3
                className="text-base font-semibold text-[var(--color-text)] "
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Team Members ({activeTeam.members.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTeam.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={member.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[var(--color-text)] ">{member.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 border border-[var(--color-border)] font-semibold capitalize text-[var(--color-text-secondary)] ">
                            {member.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)]  block mt-0.5">
                          Availability: {member.availability}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.skills.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-secondary)]  border border-[var(--color-border)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {member.role !== 'owner' && (
                      <button
                        onClick={() => setRemoveMemberTarget(member)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Stewarded Projects */}
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 md:p-6 space-y-3.5 shadow-xs">
              <h3
                className="text-sm font-bold text-[var(--color-text)]  flex items-center gap-2 font-mono uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <FolderOpen className="w-4 h-4 text-[var(--color-text)] " /> Stewarded Projects ({associatedProjects.length})
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] ">
                Projects maintained collaboratively by {activeTeam.name}:
              </p>

              <div className="space-y-2">
                {associatedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]/70 border-[var(--color-border)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)] ">{p.title}</h4>
                      <span className="text-[10px] font-mono font-bold text-[var(--color-text)] ">{p.progress}%</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]  line-clamp-1">{p.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        title="Create New Team Collective"
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
          <Input
            label="Team Name"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Team Verdant or AudioCraft Lab"
          />
          <Textarea
            label="Mission / Focus Description"
            rows={3}
            value={teamDesc}
            onChange={(e) => setTeamDesc(e.target.value)}
            placeholder="What shared technical or product mission unites this team?"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTeamModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Contributor to Team"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Contributor Name"
            required
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="e.g. Chloe Dubois"
          />
          <Input
            label="Skills (Comma-separated)"
            value={inviteSkills}
            onChange={(e) => setInviteSkills(e.target.value)}
            placeholder="e.g. React, UX Design, Python"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirm */}
      <ConfirmDialog
        isOpen={!!removeMemberTarget}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={() => {
          if (removeMemberTarget && activeTeam) {
            removeMember(activeTeam.id, removeMemberTarget.id);
            setRemoveMemberTarget(null);
          }
        }}
        title={`Remove ${removeMemberTarget?.name}?`}
        message="This collaborator will lose access to team project channels."
        confirmLabel="Remove Contributor"
        confirmVariant="danger"
      />
    </div>
  );
}

export default TeamsPage;
