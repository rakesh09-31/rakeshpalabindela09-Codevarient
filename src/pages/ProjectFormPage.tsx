import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Layers,
  Code2,
  TrendingUp,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ProjectStatus, ProjectVisibility } from '../types';
import { Input, Textarea, Button } from '../components/ui';

export default function ProjectFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { projects, createProject, updateProject } = useApp();

  const isEditing = Boolean(id);
  const existingProject = projects.find((p) => p.id === id);

  const [activeSection, setActiveSection] = useState<'basics' | 'tech' | 'progress' | 'memory'>('basics');

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [originalIdea, setOriginalIdea] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web App');
  const [targetAudience, setTargetAudience] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('team');

  // Tech state
  const [languages, setLanguages] = useState<string[]>(['TypeScript']);
  const [newLanguage, setNewLanguage] = useState('');
  const [frameworks, setFrameworks] = useState<string[]>(['React']);
  const [newFramework, setNewFramework] = useState('');
  const [libraries, setLibraries] = useState<string[]>(['Tailwind']);
  const [newLibrary, setNewLibrary] = useState('');
  const [apis, setApis] = useState<string[]>([]);
  const [newApi, setNewApi] = useState('');
  const [tools, setTools] = useState<string[]>(['Vite']);
  const [newTool, setNewTool] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [readmeUrl, setReadmeUrl] = useState('');

  // Progress state
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [plannedCompletionDate, setPlannedCompletionDate] = useState('');
  const [completedFeatures, setCompletedFeatures] = useState<string[]>([]);
  const [newCompletedFeature, setNewCompletedFeature] = useState('');
  const [inProgressFeatures, setInProgressFeatures] = useState<string[]>([]);
  const [newInProgressFeature, setNewInProgressFeature] = useState('');
  const [plannedFeatures, setPlannedFeatures] = useState<string[]>([]);
  const [newPlannedFeature, setNewPlannedFeature] = useState('');

  // Tags
  const [tags, setTags] = useState<string[]>(['ideas']);
  const [newTag, setNewTag] = useState('');

  // Memory & Blockers
  const [whyStopped, setWhyStopped] = useState('');
  const [technicalBlockers, setTechnicalBlockers] = useState<string[]>([]);
  const [newBlocker, setNewBlocker] = useState('');
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [newMissingSkill, setNewMissingSkill] = useState('');
  const [knownBugs, setKnownBugs] = useState<string[]>([]);
  const [newBug, setNewBug] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState<string[]>([]);
  const [newLesson, setNewLesson] = useState('');
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [newNextStep, setNewNextStep] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill if editing
  useEffect(() => {
    if (existingProject) {
      setTitle(existingProject.title);
      setSummary(existingProject.summary);
      setOriginalIdea(existingProject.originalIdea || '');
      setGoal(existingProject.goal || '');
      setDescription(existingProject.description || '');
      setCategory(existingProject.category || 'Web App');
      setTargetAudience(existingProject.targetAudience || '');
      setVisibility(existingProject.visibility);

      setLanguages(existingProject.languages || []);
      setFrameworks(existingProject.frameworks || []);
      setLibraries(existingProject.libraries || []);
      setApis(existingProject.apis || []);
      setTools(existingProject.tools || []);
      setRepoUrl(existingProject.repoUrl || '');
      setDemoUrl(existingProject.demoUrl || '');
      setReadmeUrl(existingProject.readmeUrl || '');

      setStatus(existingProject.status);
      setStartDate(existingProject.startDate ? existingProject.startDate.split('T')[0] : '');
      setPlannedCompletionDate(
        existingProject.plannedCompletionDate ? existingProject.plannedCompletionDate.split('T')[0] : ''
      );
      setCompletedFeatures(existingProject.completedFeatures || []);
      setInProgressFeatures(existingProject.inProgressFeatures || []);
      setPlannedFeatures(existingProject.plannedFeatures || []);
      setTags(existingProject.tags || []);

      setWhyStopped(existingProject.whyStopped || '');
      setTechnicalBlockers(existingProject.technicalBlockers || []);
      setMissingSkills(existingProject.missingSkills || []);
      setKnownBugs(existingProject.knownBugs || []);
      setLessonsLearned(existingProject.lessonsLearned || []);
      setNextSteps(existingProject.nextSteps || []);
    }
  }, [existingProject]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Project title is required';
    if (!summary.trim()) errs.summary = 'A short summary is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setActiveSection('basics');
      return;
    }

    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      originalIdea: originalIdea.trim() || summary.trim(),
      goal: goal.trim() || summary.trim(),
      description: description.trim() || summary.trim(),
      category: category.trim(),
      tags,
      targetAudience: targetAudience.trim() || 'General public',
      visibility,

      languages,
      frameworks,
      libraries,
      apis,
      tools,
      repoUrl: repoUrl.trim() || undefined,
      demoUrl: demoUrl.trim() || undefined,
      readmeUrl: readmeUrl.trim() || undefined,

      status,
      startDate: new Date(startDate || Date.now()).toISOString(),
      plannedCompletionDate: plannedCompletionDate ? new Date(plannedCompletionDate).toISOString() : undefined,
      completedFeatures,
      inProgressFeatures,
      plannedFeatures,
      milestones: existingProject?.milestones || [
        {
          id: `m-init-${Date.now()}`,
          title: 'Foundation & Core MVP',
          description: 'Initial development sprint deliverables',
          createdAt: new Date().toISOString(),
          tasks: [
            {
              id: `t-init-1`,
              title: 'Define scope & set up development environment',
              status: 'todo',
              priority: 'high',
              weight: 3,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],

      whyStopped: whyStopped.trim() || undefined,
      technicalBlockers,
      missingSkills,
      knownBugs,
      lessonsLearned,
      importantDecisions: existingProject?.importantDecisions || [],
      plannedModifications: existingProject?.plannedModifications || [],
      futureImprovements: existingProject?.futureImprovements || [],
      nextSteps,

      teamMembers: existingProject?.teamMembers || [
        {
          id: 'user-1',
          name: 'Alex Rivera',
          role: 'owner',
          skills: languages.concat(frameworks),
          availability: 'full-time',
          joinedAt: new Date().toISOString(),
        },
      ],
      attachments: existingProject?.attachments || [],
      bookmarked: existingProject?.bookmarked || false,
      ownerId: 'user-1',
      ownerName: 'Alex Rivera',
    };

    if (isEditing && id) {
      updateProject(id, payload, 'Updated project memory and configuration');
      navigate(`/projects/${id}`);
    } else {
      const created = createProject(payload);
      navigate(`/projects/${created.id}`);
    }
  };

  const addPill = (
    list: string[],
    setList: (val: string[]) => void,
    val: string,
    setVal: (v: string) => void
  ) => {
    if (val.trim() && !list.includes(val.trim())) {
      setList([...list, val.trim()]);
      setVal('');
    }
  };

  const removePill = (list: string[], setList: (val: string[]) => void, itemToRemove: string) => {
    setList(list.filter((i) => i !== itemToRemove));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text)] transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Return
        </button>

        <h1
          className="text-xl md:text-2xl font-bold text-[var(--color-text)] dark:text-[var(--color-text)] tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEditing ? `Edit: ${existingProject?.title || 'Project'}` : 'Plant New Project'}
        </h1>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          className="self-end sm:self-auto"
        >
          <Save className="w-4 h-4" /> Save Project Memory
        </Button>
      </div>

      {/* Multi-Section Tabs */}
      <div className="bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 rounded-2xl p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 border border-[var(--color-border)] dark:border-[var(--color-border)]/80">
        {[
          { id: 'basics', label: '1. Basics & Spark', icon: Layers },
          { id: 'tech', label: '2. Tech Stack', icon: Code2 },
          { id: 'progress', label: '3. Scope & Features', icon: TrendingUp },
          { id: 'memory', label: '4. Blockers & Memory', icon: AlertTriangle },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-brand)] text-white dark:bg-[var(--color-brand)] dark:text-white font-semibold shadow-2xs'
                  : 'text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] dark:border-[var(--color-border)]/80 p-6 md:p-8 shadow-2xs space-y-6">
        {/* ================= SECTION 1: BASICS ================= */}
        {activeSection === 'basics' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]/80 pb-2">
              Project Identity & Vision
            </h2>

            <Input
              label="Project Title *"
              required
              value={title}
              error={errors.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. EcoTrack or CodeMentor AI"
            />

            <Input
              label="Elevator Summary *"
              required
              value={summary}
              error={errors.summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One clear sentence describing what this project accomplishes."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Category / Domain
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                >
                  <option value="Web App">Web App</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Developer Tools">Developer Tools</option>
                  <option value="Climate & Sustainability">Climate & Sustainability</option>
                  <option value="Education & Productivity">Education & Productivity</option>
                  <option value="Creative Tools & Gaming">Creative Tools & Gaming</option>
                  <option value="Community & Culture">Community & Culture</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                >
                  <option value="private">Private (Only You)</option>
                  <option value="team">Team (Collaborators)</option>
                  <option value="public">Public (Showcase in Discover)</option>
                </select>
              </div>
            </div>

            <Textarea
              label="Original Idea & Spark"
              rows={3}
              value={originalIdea}
              onChange={(e) => setOriginalIdea(e.target.value)}
              placeholder="What initial frustration or curiosity inspired you to begin this?"
            />

            <Textarea
              label="Target Goal"
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What does a complete, finished v1.0 look like?"
            />

            <Textarea
              label="Full Description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide architectural or user experience context..."
            />

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 text-[var(--color-text)] dark:text-[var(--color-text)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)] flex items-center gap-1.5 font-mono"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removePill(tags, setTags, t)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPill(tags, setTags, newTag, setNewTag);
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-64 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(tags, setTags, newTag, setNewTag)}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: TECH STACK ================= */}
        {activeSection === 'tech' && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]/80 pb-2">
              Technology Stack & URLs
            </h2>

            {/* Languages */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Programming Languages
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {languages.map((l) => (
                  <span
                    key={l}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 text-[var(--color-text)] dark:text-[var(--color-text)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)] flex items-center gap-1.5 font-mono"
                  >
                    {l}
                    <button
                      type="button"
                      onClick={() => removePill(languages, setLanguages, l)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="e.g. TypeScript, Python, Rust"
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-64 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(languages, setLanguages, newLanguage, setNewLanguage)}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Frameworks */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Frameworks
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {frameworks.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 text-[var(--color-text)] dark:text-[var(--color-text)] border border-[var(--color-border)] dark:border-[var(--color-border-strong)] flex items-center gap-1.5 font-mono"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => removePill(frameworks, setFrameworks, f)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newFramework}
                  onChange={(e) => setNewFramework(e.target.value)}
                  placeholder="e.g. React, Next.js, FastAPI"
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-64 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(frameworks, setFrameworks, newFramework, setNewFramework)}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Libraries & APIs & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Libraries & Dependencies
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {libraries.map((lib) => (
                    <span
                      key={lib}
                      className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 border border-[var(--color-border)] dark:border-[var(--color-border-strong)] text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] flex items-center gap-1 font-mono"
                    >
                      {lib}
                      <button
                        type="button"
                        onClick={() => removePill(libraries, setLibraries, lib)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newLibrary}
                    onChange={(e) => setNewLibrary(e.target.value)}
                    placeholder="e.g. Tailwind, Zustand"
                    className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-full focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPill(libraries, setLibraries, newLibrary, setNewLibrary)}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  APIs & External Services
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {apis.map((a) => (
                    <span
                      key={a}
                      className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 border border-[var(--color-border)] dark:border-[var(--color-border-strong)] text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] flex items-center gap-1 font-mono"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => removePill(apis, setApis, a)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newApi}
                    onChange={(e) => setNewApi(e.target.value)}
                    placeholder="e.g. OpenAI API, Stripe"
                    className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-full focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPill(apis, setApis, newApi, setNewApi)}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Tools, Utilities & Dependencies
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tools.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-surface-subtle)] dark:bg-[var(--color-brand)]/60 border border-[var(--color-border)] dark:border-[var(--color-border-strong)] text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] flex items-center gap-1 font-mono"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removePill(tools, setTools, t)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 max-w-md">
                  <input
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    placeholder="e.g. Vite, Docker, Turborepo"
                    className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] w-full focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addPill(tools, setTools, newTool, setNewTool)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <Input
                label="GitHub Repository URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
              <Input
                label="Live Demo URL"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://preview.dev"
              />
              <Input
                label="README URL"
                value={readmeUrl}
                onChange={(e) => setReadmeUrl(e.target.value)}
                placeholder="https://github.com/...#readme"
              />
            </div>
          </div>
        )}

        {/* ================= SECTION 3: PROGRESS & SCOPE ================= */}
        {activeSection === 'progress' && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]/80 pb-2">
              Scope & Feature Roadmap
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                  <option value="revived">Revived</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={plannedCompletionDate}
                  onChange={(e) => setPlannedCompletionDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
              </div>
            </div>

            {/* Completed Features */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] flex items-center gap-1.5 mb-1.5 font-mono uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed Features
              </label>
              <div className="space-y-1.5 mb-2">
                {completedFeatures.map((f) => (
                  <div
                    key={f}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)]/80 flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)]">✓</span> {f}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePill(completedFeatures, setCompletedFeatures, f)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCompletedFeature}
                  onChange={(e) => setNewCompletedFeature(e.target.value)}
                  placeholder="Add a completed milestone feature..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(completedFeatures, setCompletedFeatures, newCompletedFeature, setNewCompletedFeature)}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* In-Progress Features */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] flex items-center gap-1.5 mb-1.5 font-mono uppercase tracking-wider">
                <span className="font-mono text-xs">❚❚</span> In-Progress Features
              </label>
              <div className="space-y-1.5 mb-2">
                {inProgressFeatures.map((f) => (
                  <div
                    key={f}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)]/80 flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--color-text-muted)]">❚❚</span> {f}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePill(inProgressFeatures, setInProgressFeatures, f)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newInProgressFeature}
                  onChange={(e) => setNewInProgressFeature(e.target.value)}
                  placeholder="Add feature in development..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(inProgressFeatures, setInProgressFeatures, newInProgressFeature, setNewInProgressFeature)}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Planned & Unfinished Features */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] flex items-center gap-1.5 mb-1.5 font-mono uppercase tracking-wider">
                <span>+</span> Planned & Unfinished Features
              </label>
              <div className="space-y-1.5 mb-2">
                {plannedFeatures.map((f) => (
                  <div
                    key={f}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)]/80 flex items-center justify-between text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)]">+</span> {f}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePill(plannedFeatures, setPlannedFeatures, f)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newPlannedFeature}
                  onChange={(e) => setNewPlannedFeature(e.target.value)}
                  placeholder="Add planned next feature..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(plannedFeatures, setPlannedFeatures, newPlannedFeature, setNewPlannedFeature)}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: BLOCKERS & MEMORY ================= */}
        {activeSection === 'memory' && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]/80 pb-2">
              Abandonment Reason & Memory Preservation
            </h2>

            <Textarea
              label="Why Did This Project Stop or Pause?"
              rows={3}
              value={whyStopped}
              onChange={(e) => setWhyStopped(e.target.value)}
              placeholder="e.g. Lost momentum after co-founder relocated, or hit an API quota ceiling..."
            />

            {/* Technical Blockers */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] block mb-1.5 font-mono uppercase tracking-wider">
                Technical Blockers
              </label>
              <div className="space-y-1.5 mb-2">
                {technicalBlockers.map((b) => (
                  <div
                    key={b}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => removePill(technicalBlockers, setTechnicalBlockers, b)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="e.g. Rate limiting on 500-line PRs, or strict NAT traversal..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(technicalBlockers, setTechnicalBlockers, newBlocker, setNewBlocker)}
                >
                  Add Blocker
                </Button>
              </div>
            </div>

            {/* Lessons Learned */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Lessons Learned & Retrospective
              </label>
              <div className="space-y-1.5 mb-2">
                {lessonsLearned.map((l) => (
                  <div
                    key={l}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span>{l}</span>
                    <button
                      type="button"
                      onClick={() => removePill(lessonsLearned, setLessonsLearned, l)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newLesson}
                  onChange={(e) => setNewLesson(e.target.value)}
                  placeholder="e.g. Don't use heavy WebRTC mesh for audio-only rooms..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(lessonsLearned, setLessonsLearned, newLesson, setNewLesson)}
                >
                  Add Lesson
                </Button>
              </div>
            </div>

            {/* Missing Skills & Resources */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] block mb-1.5 font-mono uppercase tracking-wider">
                Missing Skills & Required Resources
              </label>
              <div className="space-y-1.5 mb-2">
                {missingSkills.map((s) => (
                  <div
                    key={s}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removePill(missingSkills, setMissingSkills, s)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newMissingSkill}
                  onChange={(e) => setNewMissingSkill(e.target.value)}
                  placeholder="e.g. WebRTC TURN configuration, PyTorch CUDA optimization..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(missingSkills, setMissingSkills, newMissingSkill, setNewMissingSkill)}
                >
                  Add Skill
                </Button>
              </div>
            </div>

            {/* Known Bugs & Issues */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] block mb-1.5 font-mono uppercase tracking-wider">
                Known Bugs & Open Issues
              </label>
              <div className="space-y-1.5 mb-2">
                {knownBugs.map((b) => (
                  <div
                    key={b}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => removePill(knownBugs, setKnownBugs, b)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBug}
                  onChange={(e) => setNewBug(e.target.value)}
                  placeholder="e.g. Safari microphone permission deadlock on iOS 17..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(knownBugs, setKnownBugs, newBug, setNewBug)}
                >
                  Add Bug
                </Button>
              </div>
            </div>

            {/* Recommended Next Steps */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] block mb-1.5 font-mono uppercase tracking-wider">
                Recommended Next Steps for Revival
              </label>
              <div className="space-y-1.5 mb-2">
                {nextSteps.map((step) => (
                  <div
                    key={step}
                    className="text-xs p-2.5 rounded-xl bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 border border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between text-[var(--color-text)] dark:text-[var(--color-text)]"
                  >
                    <span>{step}</span>
                    <button
                      type="button"
                      onClick={() => removePill(nextSteps, setNextSteps, step)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="e.g. Migrate to hosted LiveKit instance, replace AST regex..."
                  className="px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-brand-soft)]/50 dark:bg-[var(--color-brand)]/40 text-[var(--color-text)] dark:text-[var(--color-text)] flex-1 focus:outline-none focus:border-zinc-900 dark:focus:border-[var(--color-border)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPill(nextSteps, setNextSteps, newNextStep, setNewNextStep)}
                >
                  Add Step
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Form Bottom Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)] dark:border-[var(--color-border)]/80">
          <div className="flex gap-2">
            {activeSection !== 'basics' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeSection === 'memory') setActiveSection('progress');
                  else if (activeSection === 'progress') setActiveSection('tech');
                  else if (activeSection === 'tech') setActiveSection('basics');
                }}
              >
                Previous Section
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {activeSection !== 'memory' ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  if (activeSection === 'basics') setActiveSection('tech');
                  else if (activeSection === 'tech') setActiveSection('progress');
                  else if (activeSection === 'progress') setActiveSection('memory');
                }}
              >
                Next Section
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Save Project
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
