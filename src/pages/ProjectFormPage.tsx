import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Layers,
  Code2,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Project, ProjectStatus, ProjectVisibility } from '../types';
import { Input, Textarea, Select } from '../components/ui';

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
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
              title: 'Initialize repository structure & basic layout',
              status: 'completed',
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-light hover:text-forest"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Return
        </button>

        <h1 className="text-xl md:text-2xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
          {isEditing ? `Edit: ${existingProject?.title || 'Project'}` : 'Plant New Project'}
        </h1>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-light shadow-sm"
        >
          <Save className="w-4 h-4" /> Save Project Memory
        </button>
      </div>

      {/* Multi-Section Tabs */}
      <div className="bg-white rounded-2xl border border-gray-green-border/60 p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1 shadow-xs">
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
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-light hover:bg-ivory-warm hover:text-charcoal'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-green-border/60 p-6 md:p-8 shadow-sm space-y-6">
        {/* ================= SECTION 1: BASICS ================= */}
        {activeSection === 'basics' && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-charcoal border-b border-gray-green-border/40 pb-2">
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
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Category / Domain
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
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
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
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
              <label className="text-xs font-semibold text-charcoal-light block mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-paleblue-light text-teal flex items-center gap-1"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removePill(tags, setTags, t)}
                      className="hover:text-rose"
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
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory w-64"
                />
                <button
                  type="button"
                  onClick={() => addPill(tags, setTags, newTag, setNewTag)}
                  className="px-3 py-1.5 rounded-xl border text-xs text-charcoal"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: TECH STACK ================= */}
        {activeSection === 'tech' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-charcoal border-b border-gray-green-border/40 pb-2">
              Technology Stack & URLs
            </h2>

            {/* Languages */}
            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Programming Languages
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {languages.map((l) => (
                  <span key={l} className="text-xs px-2.5 py-1 rounded-lg bg-ivory-warm border border-gray-green-border flex items-center gap-1">
                    {l}
                    <button type="button" onClick={() => removePill(languages, setLanguages, l)}>
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
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory w-64"
                />
                <button
                  type="button"
                  onClick={() => addPill(languages, setLanguages, newLanguage, setNewLanguage)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Frameworks */}
            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Frameworks
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {frameworks.map((f) => (
                  <span key={f} className="text-xs px-2.5 py-1 rounded-lg bg-ivory-warm border border-gray-green-border flex items-center gap-1">
                    {f}
                    <button type="button" onClick={() => removePill(frameworks, setFrameworks, f)}>
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
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory w-64"
                />
                <button
                  type="button"
                  onClick={() => addPill(frameworks, setFrameworks, newFramework, setNewFramework)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Libraries & APIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Libraries & Dependencies
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {libraries.map((lib) => (
                    <span key={lib} className="text-xs px-2 py-0.5 rounded bg-ivory border flex items-center gap-1">
                      {lib}
                      <button type="button" onClick={() => removePill(libraries, setLibraries, lib)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newLibrary}
                    onChange={(e) => setNewLibrary(e.target.value)}
                    placeholder="e.g. Tailwind, Zustand"
                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory w-full"
                  />
                  <button type="button" onClick={() => addPill(libraries, setLibraries, newLibrary, setNewLibrary)} className="px-3 py-1.5 rounded-xl border text-xs">Add</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  APIs & External Services
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {apis.map((a) => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded bg-ivory border flex items-center gap-1">
                      {a}
                      <button type="button" onClick={() => removePill(apis, setApis, a)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newApi}
                    onChange={(e) => setNewApi(e.target.value)}
                    placeholder="e.g. OpenAI API, Stripe"
                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory w-full"
                  />
                  <button type="button" onClick={() => addPill(apis, setApis, newApi, setNewApi)} className="px-3 py-1.5 rounded-xl border text-xs">Add</button>
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
            <h2 className="text-base font-semibold text-charcoal border-b border-gray-green-border/40 pb-2">
              Scope & Feature Roadmap
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
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
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-charcoal-light block mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={plannedCompletionDate}
                  onChange={(e) => setPlannedCompletionDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-green-border bg-ivory focus:outline-none"
                />
              </div>
            </div>

            {/* Completed Features */}
            <div>
              <label className="text-xs font-semibold text-forest flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed Features
              </label>
              <div className="space-y-1 mb-2">
                {completedFeatures.map((f) => (
                  <div key={f} className="text-xs p-2 rounded-lg bg-mint-pale/50 border border-mint/30 flex items-center justify-between">
                    <span>{f}</span>
                    <button type="button" onClick={() => removePill(completedFeatures, setCompletedFeatures, f)}><X className="w-3 h-3 text-rose" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCompletedFeature}
                  onChange={(e) => setNewCompletedFeature(e.target.value)}
                  placeholder="Add a completed milestone feature..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory flex-1"
                />
                <button type="button" onClick={() => addPill(completedFeatures, setCompletedFeatures, newCompletedFeature, setNewCompletedFeature)} className="px-3 py-1.5 rounded-xl border text-xs">Add</button>
              </div>
            </div>

            {/* In-Progress Features */}
            <div>
              <label className="text-xs font-semibold text-amber block mb-1">
                In-Progress Features
              </label>
              <div className="space-y-1 mb-2">
                {inProgressFeatures.map((f) => (
                  <div key={f} className="text-xs p-2 rounded-lg bg-amber-warm/40 border border-amber/30 flex items-center justify-between">
                    <span>{f}</span>
                    <button type="button" onClick={() => removePill(inProgressFeatures, setInProgressFeatures, f)}><X className="w-3 h-3 text-rose" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newInProgressFeature}
                  onChange={(e) => setNewInProgressFeature(e.target.value)}
                  placeholder="Add feature in development..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory flex-1"
                />
                <button type="button" onClick={() => addPill(inProgressFeatures, setInProgressFeatures, newInProgressFeature, setNewInProgressFeature)} className="px-3 py-1.5 rounded-xl border text-xs">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: BLOCKERS & MEMORY ================= */}
        {activeSection === 'memory' && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-charcoal border-b border-gray-green-border/40 pb-2">
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
              <label className="text-xs font-semibold text-rose block mb-1">
                Technical Blockers
              </label>
              <div className="space-y-1 mb-2">
                {technicalBlockers.map((b) => (
                  <div key={b} className="text-xs p-2 rounded-lg bg-rose-light/20 border border-rose-light/40 flex items-center justify-between text-rose">
                    <span>{b}</span>
                    <button type="button" onClick={() => removePill(technicalBlockers, setTechnicalBlockers, b)}><X className="w-3 h-3 text-rose" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="e.g. Rate limiting on 500-line PRs, or strict NAT traversal..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory flex-1"
                />
                <button type="button" onClick={() => addPill(technicalBlockers, setTechnicalBlockers, newBlocker, setNewBlocker)} className="px-3 py-1.5 rounded-xl border text-xs">Add Blocker</button>
              </div>
            </div>

            {/* Lessons Learned */}
            <div>
              <label className="text-xs font-semibold text-charcoal-light block mb-1">
                Lessons Learned & Retrospective
              </label>
              <div className="space-y-1 mb-2">
                {lessonsLearned.map((l) => (
                  <div key={l} className="text-xs p-2 rounded-lg bg-ivory border flex items-center justify-between">
                    <span>{l}</span>
                    <button type="button" onClick={() => removePill(lessonsLearned, setLessonsLearned, l)}><X className="w-3 h-3 text-rose" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newLesson}
                  onChange={(e) => setNewLesson(e.target.value)}
                  placeholder="e.g. Don't use heavy WebRTC mesh for audio-only rooms..."
                  className="px-3 py-1.5 text-xs rounded-xl border border-gray-green-border bg-ivory flex-1"
                />
                <button type="button" onClick={() => addPill(lessonsLearned, setLessonsLearned, newLesson, setNewLesson)} className="px-3 py-1.5 rounded-xl border text-xs">Add Lesson</button>
              </div>
            </div>
          </div>
        )}

        {/* Form Bottom Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-green-border/40">
          <div className="flex gap-2">
            {activeSection !== 'basics' && (
              <button
                type="button"
                onClick={() => {
                  if (activeSection === 'memory') setActiveSection('progress');
                  else if (activeSection === 'progress') setActiveSection('tech');
                  else if (activeSection === 'tech') setActiveSection('basics');
                }}
                className="px-4 py-2 rounded-xl border border-gray-green-border text-xs sm:text-sm font-medium hover:bg-ivory-warm"
              >
                Previous Section
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {activeSection !== 'memory' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeSection === 'basics') setActiveSection('tech');
                  else if (activeSection === 'tech') setActiveSection('progress');
                  else if (activeSection === 'progress') setActiveSection('memory');
                }}
                className="px-4 py-2 rounded-xl bg-ivory-warm border border-gray-green-border text-xs sm:text-sm font-semibold hover:bg-gray-green-light/30 text-charcoal"
              >
                Next Section
              </button>
            ) : (
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-forest text-white text-xs sm:text-sm font-semibold hover:bg-forest-light shadow-sm"
              >
                Save Project
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
