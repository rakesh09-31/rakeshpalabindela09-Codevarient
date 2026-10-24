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
import { Avatar, Badge, Modal, Input, Textarea, ConfirmDialog } from '../components/ui';

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-mint-pale flex items-center justify-center text-forest">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              Teams & Collaboration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-light mt-1">
            Build together. Form collectives, share project stewardship, and review contributor applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-light transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      {!activeTeam ? (
        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-12 text-center">
          <Users className="w-12 h-12 text-gray-green-light mx-auto mb-3" />
          <h3 className="text-base font-semibold text-charcoal">No teams formed yet</h3>
          <p className="text-xs text-charcoal-light mb-4">
            Create your first collective to invite collaborators.
          </p>
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold"
          >
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Team Info & Members */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Overview Card */}
            <div className="bg-white rounded-3xl border border-gray-green-border/60 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center text-xl font-bold shadow-xs">
                    {activeTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                      {activeTeam.name}
                    </h2>
                    <p className="text-xs text-charcoal-light">{activeTeam.members.length} active members</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ivory-warm border border-gray-green-border text-xs sm:text-sm font-semibold text-charcoal hover:bg-white self-start sm:self-center"
                >
                  <UserPlus className="w-4 h-4" /> Invite Contributor
                </button>
              </div>

              <p className="text-xs sm:text-sm text-charcoal-light leading-relaxed">
                {activeTeam.description}
              </p>
            </div>

            {/* Pending Join Requests Queue */}
            {pendingRequests.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber/40 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Pending Join Requests ({pendingRequests.length})
                  </h3>
                  <span className="text-[11px] text-charcoal-light">Review & onboard collaborators</span>
                </div>

                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl bg-ivory border border-gray-green-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={req.userName} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-charcoal">{req.userName}</span>
                            <span className="text-[10px] text-charcoal-light">applied {new Date(req.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-charcoal-light italic mt-0.5">"{req.message}"</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {req.skills.map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-charcoal border">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => approveJoinRequest(activeTeam.id, req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-semibold hover:bg-forest-light"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => rejectJoinRequest(activeTeam.id, req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-green-border text-xs text-charcoal-light hover:text-rose hover:bg-white"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="bg-white rounded-2xl border border-gray-green-border/60 p-6 space-y-4">
              <h3 className="text-base font-semibold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                Team Members ({activeTeam.members.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTeam.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl border border-gray-green-border/60 bg-ivory/40 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={member.name} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-charcoal">{member.name}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-ivory-warm border border-gray-green-border font-semibold capitalize">
                            {member.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-charcoal-light block mt-0.5">
                          Availability: {member.availability}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.skills.map((s) => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-charcoal-light border border-gray-green-border/60">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {member.role !== 'owner' && (
                      <button
                        onClick={() => setRemoveMemberTarget(member)}
                        className="p-1 text-charcoal-light hover:text-rose"
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
            <div className="bg-white rounded-2xl border border-gray-green-border/60 p-5 space-y-3">
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <FolderOpen className="w-4 h-4 text-forest" /> Stewarded Projects ({associatedProjects.length})
              </h3>
              <p className="text-xs text-charcoal-light">
                Projects maintained collaboratively by {activeTeam.name}:
              </p>

              <div className="space-y-2">
                {associatedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="p-3 rounded-xl bg-ivory hover:bg-mint-pale/30 border border-gray-green-border/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs sm:text-sm font-bold text-charcoal">{p.title}</h4>
                      <span className="text-[10px] font-bold text-forest">{p.progress}%</span>
                    </div>
                    <p className="text-[11px] text-charcoal-light line-clamp-1">{p.summary}</p>
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
            <button
              type="button"
              onClick={() => setShowCreateTeamModal(false)}
              className="px-3.5 py-2 rounded-xl border text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
            >
              Create Team
            </button>
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
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="px-3.5 py-2 rounded-xl border text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
            >
              Add Member
            </button>
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
