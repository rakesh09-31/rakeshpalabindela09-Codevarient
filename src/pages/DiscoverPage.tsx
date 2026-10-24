import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  Bookmark,
  BookmarkCheck,
  Share2,
  Users,
  Check,
  Send,
  Lock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project } from '../types';
import { Badge, Modal, Input, Textarea, Avatar } from '../components/ui';

export function DiscoverPage() {
  const { projects, updateProject } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');

  // Modals
  const [collaborateProject, setCollaborateProject] = useState<Project | null>(null);
  const [collaborateMessage, setCollaborateMessage] = useState('');
  const [collaborateSkills, setCollaborateSkills] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter public projects only
  const publicProjects = useMemo(() => {
    return projects.filter((p) => p.visibility === 'public');
  }, [projects]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [publicProjects]);

  const technologies = useMemo(() => {
    const set = new Set<string>();
    publicProjects.forEach((p) => {
      p.languages.forEach((l) => set.add(l));
      p.frameworks.forEach((f) => set.add(f));
    });
    return Array.from(set);
  }, [publicProjects]);

  const filtered = useMemo(() => {
    return publicProjects.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (
        selectedTech !== 'all' &&
        !p.languages.includes(selectedTech) &&
        !p.frameworks.includes(selectedTech)
      ) {
        return false;
      }
      return true;
    });
  }, [publicProjects, searchQuery, selectedCategory, selectedTech]);

  const handleSendCollaborateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborateProject) return;
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setCollaborateProject(null);
      setCollaborateMessage('');
      setCollaborateSkills('');
    }, 1500);
  };

  const handleCopyShareLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-paleblue-light flex items-center justify-center text-teal">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              Community Project Discovery
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-light mt-1">
            Discover public unfinished ideas seeking collaborators, feedback, or a second life.
          </p>
        </div>

        <div className="text-xs text-charcoal-light bg-white px-3 py-2 rounded-xl border border-gray-green-border shadow-xs flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-forest" />
          <span>Private projects remain securely hidden in personal gardens.</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-gray-green-border/60 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-light" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search public community projects..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-green-border bg-ivory focus:outline-none focus:border-mint"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl border border-gray-green-border bg-white text-charcoal focus:outline-none"
          >
            <option value="all">All Domains</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl border border-gray-green-border bg-white text-charcoal focus:outline-none"
          >
            <option value="all">All Technologies</option>
            {technologies.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-green-border/60 p-12 text-center">
          <Globe className="w-12 h-12 text-gray-green-light mx-auto mb-3" />
          <h3 className="text-base font-semibold text-charcoal">No public projects found</h3>
          <p className="text-xs text-charcoal-light mt-1">
            Adjust your search query or set one of your private projects to Public in Settings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -3 }}
              className="bg-white rounded-3xl border border-gray-green-border/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="tech" size="sm">
                    {project.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateProject(project.id, { bookmarked: !project.bookmarked })
                      }
                      className="p-1 rounded-lg text-charcoal-light hover:text-amber"
                    >
                      {project.bookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-amber" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setShareProject(project)}
                      className="p-1 rounded-lg text-charcoal-light hover:text-charcoal"
                      title="Share link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="text-base font-bold text-charcoal hover:text-forest transition-colors cursor-pointer line-clamp-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {project.title}
                </h3>
                <p className="text-xs text-charcoal-light line-clamp-2 mt-1 leading-relaxed">
                  {project.summary}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-green-border/40 mt-4">
                <div className="flex flex-wrap gap-1">
                  {project.languages.concat(project.frameworks).slice(0, 3).map((item) => (
                    <span key={item} className="text-[10px] px-2 py-0.5 rounded bg-ivory text-charcoal-light border border-gray-green-border">
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Avatar name={project.ownerName} size="sm" />
                    <div className="text-[11px]">
                      <span className="font-semibold text-charcoal block leading-none">{project.ownerName}</span>
                      <span className="text-charcoal-light text-[10px]">{project.teamMembers.length} team members</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCollaborateProject(project)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" /> Collaborate
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Collaborate Modal */}
      <Modal
        isOpen={!!collaborateProject}
        onClose={() => setCollaborateProject(null)}
        title={`Request to Collaborate on "${collaborateProject?.title}"`}
      >
        {requestSent ? (
          <div className="py-8 text-center space-y-2">
            <Check className="w-10 h-10 text-forest mx-auto" />
            <h4 className="text-sm font-bold text-charcoal">Join Request Sent!</h4>
            <p className="text-xs text-charcoal-light">
              The project owner will receive your note and skill proposal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendCollaborateRequest} className="space-y-4">
            <p className="text-xs text-charcoal-light">
              Declare your available skills and explain how you can help bring this project back to life.
            </p>

            <Input
              label="Your Core Skills / Technologies"
              required
              value={collaborateSkills}
              onChange={(e) => setCollaborateSkills(e.target.value)}
              placeholder="e.g. React, Rust, UI Design, Mobile Optimization"
            />

            <Textarea
              label="Note to Project Creator"
              required
              rows={3}
              value={collaborateMessage}
              onChange={(e) => setCollaborateMessage(e.target.value)}
              placeholder="Hi! I saw your project in Discover. I'd love to help tackle the pending milestone tasks..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCollaborateProject(null)}
                className="px-3.5 py-2 rounded-xl border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light"
              >
                <Send className="w-3.5 h-3.5" /> Submit Request
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={!!shareProject}
        onClose={() => setShareProject(null)}
        title="Share Project"
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-light">
            Share this project with potential collaborators, hackathon judges, or on social channels:
          </p>

          <div className="flex items-center gap-2 p-2 bg-ivory rounded-xl border border-gray-green-border">
            <span className="text-xs text-charcoal font-mono truncate flex-1 px-2">
              {window.location.origin}/projects/{shareProject?.id}
            </span>
            <button
              onClick={handleCopyShareLink}
              className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-semibold hover:bg-forest-light flex items-center gap-1"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : 'Copy'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DiscoverPage;
