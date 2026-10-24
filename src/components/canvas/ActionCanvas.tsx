import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Merge,
  Eye,
  Archive,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Layers,
  Hand,
  ChevronLeft,
  ChevronRight,
  Calendar,
  GripVertical,
  LayoutGrid,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { DraggableProjectCard } from './DraggableProjectCard';
import { ActionZone } from './ActionZone';
import { ProjectArtwork } from '../common/ProjectArtwork';
import { Badge, ProgressBar } from '../ui';
import {
  validateReviveDrop,
  validateFuseDrop,
} from '../../lib/canvasDnd';

interface ActionCanvasProps {
  onExitCanvas?: () => void;
}

export function ActionCanvas({ onExitCanvas }: ActionCanvasProps) {
  const { projects, changeProjectStatus, deleteProject, refreshProjects } = useApp();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus | 'revivable'>('all');

  // Presentation view mode: 'showcase' (default glass-slide carousel) vs 'grid' (optional)
  const [presentationMode, setPresentationMode] = useState<'showcase' | 'grid'>('showcase');

  // Dragging and Pick-up state
  const [activeDragProject, setActiveDragProject] = useState<Project | null>(null);
  const [pickedUpProject, setPickedUpProject] = useState<Project | null>(null);

  // Staged states for multi-step zones
  const [stagedFuseP1, setStagedFuseP1] = useState<Project | null>(null);
  const [stagedArchiveProject, setStagedArchiveProject] = useState<Project | null>(null);
  const [stagedDeleteProject, setStagedDeleteProject] = useState<Project | null>(null);

  // Feedback notification state
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }>({
    type: 'info',
    message: 'Drag any project slide into an Action Zone, or press Space / "Pick Up" to execute with keyboard.',
  });

  // Mobile Touch Drag State
  const [touchDraggingProject, setTouchDraggingProject] = useState<Project | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);

  // Carousel Index & Navigation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animDirection, setAnimDirection] = useState<'next' | 'prev' | null>(null);
  const isAnimatingRef = useRef(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const showcaseContainerRef = useRef<HTMLDivElement>(null);

  // Responsive carousel dimensions
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const slideWidthPct = isMobile ? 100 : isTablet ? 84 : 74;
  const gapPct = isMobile ? 0 : 3;
  const stepPct = slideWidthPct + gapPct;
  const centerOffset = (100 - slideWidthPct) / 2;

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === 'revivable') {
        if (p.status !== 'paused' && p.status !== 'abandoned') return false;
      } else if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesSummary = p.summary?.toLowerCase().includes(q);
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesTags) return false;
      }

      return true;
    });
  }, [projects, statusFilter, categoryFilter, searchQuery]);

  // Reset index on filter change
  useEffect(() => {
    setCurrentIndex(0);
  }, [statusFilter, categoryFilter, searchQuery]);

  // Safe Index
  const safeIndex =
    filteredProjects.length === 0
      ? 0
      : ((currentIndex % filteredProjects.length) + filteredProjects.length) % filteredProjects.length;

  // Circular 5-slot virtual track
  const circularSlots = useMemo(() => {
    const total = filteredProjects.length;
    if (total === 0) return [];
    if (total === 1) return [{ offset: 0, project: filteredProjects[0] }];

    const offsets = [-2, -1, 0, 1, 2];
    return offsets.map((k) => {
      const idx = ((safeIndex + k) % total + total) % total;
      return {
        offset: k,
        project: filteredProjects[idx],
      };
    });
  }, [filteredProjects, safeIndex]);

  // Navigation handlers (snappy 220ms duration)
  const handleNext = useCallback(() => {
    if (isAnimatingRef.current || filteredProjects.length <= 1) return;
    isAnimatingRef.current = true;
    setAnimDirection('next');
  }, [filteredProjects.length]);

  const handlePrev = useCallback(() => {
    if (isAnimatingRef.current || filteredProjects.length <= 1) return;
    isAnimatingRef.current = true;
    setAnimDirection('prev');
  }, [filteredProjects.length]);

  useEffect(() => {
    if (!animDirection || filteredProjects.length <= 1) return;
    const timer = setTimeout(() => {
      if (animDirection === 'next') {
        setCurrentIndex((prev) => (prev + 1) % filteredProjects.length);
      } else if (animDirection === 'prev') {
        setCurrentIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length);
      }
      setAnimDirection(null);
      isAnimatingRef.current = false;
    }, 220);
    return () => clearTimeout(timer);
  }, [animDirection, filteredProjects.length]);

  // Keyboard navigation for carousel (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (presentationMode !== 'showcase') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, presentationMode]);

  // Deliberate hover threshold on neighboring peek slides (350ms)
  const handleNeighborMouseEnter = (direction: 'prev' | 'next') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (direction === 'prev') handlePrev();
      else handleNext();
    }, 350);
  };

  const handleNeighborMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Synchronize thumbnail strip scroll position
  useEffect(() => {
    if (thumbnailStripRef.current && filteredProjects.length > 0) {
      const activeThumb = thumbnailStripRef.current.querySelector(
        `[data-thumb-index="${safeIndex}"]`
      ) as HTMLElement | null;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex, filteredProjects.length]);

  // Currently evaluated project (either actively dragged, picked up, or touch-dragged)
  const evaluatedProject = activeDragProject || pickedUpProject || touchDraggingProject;

  // Clear global drag on drop or mouseup
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setActiveDragProject(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => window.removeEventListener('dragend', handleGlobalDragEnd);
  }, []);

  // Keyboard Escape cancels picked up and staged states
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickedUpProject) {
          setPickedUpProject(null);
          setFeedback({
            type: 'info',
            message: 'Cancelled project selection.',
          });
        }
        if (stagedArchiveProject) setStagedArchiveProject(null);
        if (stagedDeleteProject) setStagedDeleteProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pickedUpProject, stagedArchiveProject, stagedDeleteProject]);

  // Helper to extract Project from drag payload or picked state
  const resolveProjectFromPayload = useCallback(
    (raw: string): Project | null => {
      if (raw === '__KEYBOARD_PICKED__') {
        return pickedUpProject;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed.id) {
          return projects.find((p) => p.id === parsed.id) || null;
        }
      } catch {
        return projects.find((p) => p.id === raw) || null;
      }
      return null;
    },
    [pickedUpProject, projects]
  );

  // ================= ACTION ZONE HANDLERS =================

  // 1. REVIVE ZONE
  const handleDropRevive = (raw: string) => {
    const p = resolveProjectFromPayload(raw);
    if (!p) return;

    const validation = validateReviveDrop(p);
    if (!validation.valid) {
      setFeedback({
        type: 'error',
        message: validation.reason || `Cannot revive "${p.title}".`,
      });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Navigating to Revival Studio for "${p.title}"...`,
    });
    setPickedUpProject(null);
    setTimeout(() => {
      navigate(`/revival-studio?project=${p.id}`);
    }, 350);
  };

  // 2. FUSE ZONE
  const handleDropFuse = (raw: string) => {
    const p = resolveProjectFromPayload(raw);
    if (!p) return;

    if (!stagedFuseP1) {
      setStagedFuseP1(p);
      setPickedUpProject(null);
      setFeedback({
        type: 'info',
        message: `Staged "${p.title}" for Fusion. Now drag a second, distinct project.`,
      });
    } else {
      const validation = validateFuseDrop(stagedFuseP1, p);
      if (!validation.valid) {
        setFeedback({
          type: 'error',
          message: validation.reason || 'Invalid fusion pairing.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Fusing "${stagedFuseP1.title}" with "${p.title}"! Initializing AI Synthesis...`,
      });
      const p1Id = stagedFuseP1.id;
      const p2Id = p.id;
      setStagedFuseP1(null);
      setPickedUpProject(null);
      setTimeout(() => {
        navigate(`/project-fusion?project1=${p1Id}&project2=${p2Id}`);
      }, 400);
    }
  };

  // 3. INSPECT ZONE
  const handleDropInspect = (raw: string) => {
    const p = resolveProjectFromPayload(raw);
    if (!p) return;

    setFeedback({
      type: 'success',
      message: `Opening Case File dossier for "${p.title}"...`,
    });
    setPickedUpProject(null);
    setTimeout(() => {
      navigate(`/projects/${p.id}`);
    }, 250);
  };

  // 4. ARCHIVE ZONE (Two-stage explicit drop confirmation)
  const handleDropArchive = (raw: string) => {
    const p = resolveProjectFromPayload(raw);
    if (!p) return;

    setStagedArchiveProject(p);
    setPickedUpProject(null);
    setFeedback({
      type: 'warning',
      message: `Staged "${p.title}" for cold storage. Drop again into Confirm Archive to execute.`,
    });
  };

  const handleConfirmArchive = () => {
    if (!stagedArchiveProject) return;
    const target = stagedArchiveProject;
    try {
      changeProjectStatus(target.id, 'archived', 'Archived via Canvas Protocol');
      setFeedback({
        type: 'success',
        message: `"${target.title}" has been safely archived to cold storage.`,
      });
      setStagedArchiveProject(null);
      refreshProjects();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to archive project.',
      });
    }
  };

  // 5. DELETE ZONE (Two-stage explicit drop confirmation)
  const handleDropDelete = (raw: string) => {
    const p = resolveProjectFromPayload(raw);
    if (!p) return;

    setStagedDeleteProject(p);
    setPickedUpProject(null);
    setFeedback({
      type: 'warning',
      message: `Staged "${p.title}" for deletion. Drop again into Confirm Delete to permanently remove.`,
    });
  };

  const handleConfirmDelete = () => {
    if (!stagedDeleteProject) return;
    const target = stagedDeleteProject;
    try {
      deleteProject(target.id);
      setFeedback({
        type: 'success',
        message: `"${target.title}" was permanently removed.`,
      });
      setStagedDeleteProject(null);
      refreshProjects();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete project.',
      });
    }
  };

  // Drag start handler for slides
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    e.dataTransfer.setData('text/plain', project.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'project',
        id: project.id,
        title: project.title,
        status: project.status,
        category: project.category,
        summary: project.summary,
        progress: project.progress,
      })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
    setActiveDragProject(project);
  };

  const handleDragEnd = () => {
    setActiveDragProject(null);
  };

  // Touch Drag Handlers
  const handleTouchStart = (e: React.TouchEvent, project: Project) => {
    const touch = e.touches[0];
    setTouchDraggingProject(project);
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggingProject) return;
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!touchDraggingProject || !touchPos) {
      setTouchDraggingProject(null);
      setTouchPos(null);
      return;
    }

    const elem = document.elementFromPoint(touchPos.x, touchPos.y);
    const dropZone = elem?.closest<HTMLElement>('[data-drop-zone]');

    if (dropZone) {
      const zoneId = dropZone.getAttribute('data-drop-zone');
      const payload = JSON.stringify({ id: touchDraggingProject.id, title: touchDraggingProject.title });

      if (zoneId === 'zone-revive') handleDropRevive(payload);
      else if (zoneId === 'zone-fuse') handleDropFuse(payload);
      else if (zoneId === 'zone-inspect') handleDropInspect(payload);
      else if (zoneId === 'zone-archive') handleDropArchive(payload);
      else if (zoneId === 'zone-delete') handleDropDelete(payload);
    }

    setTouchDraggingProject(null);
    setTouchPos(null);
  };

  // Keyboard Pick up toggle
  const handlePickUp = (project: Project) => {
    if (pickedUpProject?.id === project.id) {
      setPickedUpProject(null);
      setFeedback({
        type: 'info',
        message: 'Released project card.',
      });
    } else {
      setPickedUpProject(project);
      setFeedback({
        type: 'info',
        message: `Selected "${project.title}". Press Enter on any Action Zone above to execute.`,
      });
    }
  };

  const formatPlantedDate = (isoString?: string) => {
    if (!isoString) return 'Preserved';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Preserved';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Validation evaluations for current item
  const reviveValidation = evaluatedProject
    ? validateReviveDrop(evaluatedProject)
    : { valid: true };

  const fuseValidation = evaluatedProject
    ? validateFuseDrop(stagedFuseP1, evaluatedProject)
    : { valid: true };

  // Track translation offset
  const baseTrackOffset =
    filteredProjects.length > 1 ? centerOffset - 2 * stepPct : centerOffset;
  const trackTranslation =
    animDirection === 'next' ? -stepPct : animDirection === 'prev' ? stepPct : 0;

  return (
    <div
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative space-y-6 pb-12 select-none"
    >
      {/* ================= 1. THE CANVAS PROTOCOL HEADER ================= */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#17131F] via-[#211A2D] to-[#0E0C13] border border-[#382B49] shadow-2xl overflow-hidden">
        {/* Ambient Glow Refraction */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                The Canvas Protocol
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-medium">
                Action Zones Active
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project Action Canvas
            </h1>
            <p className="text-xs sm:text-sm text-[#AAA0BA] max-w-2xl leading-relaxed">
              Drag your glass project slides directly into the designated Action Zones below to execute
              revivals, fusions, inspections, or cold storage archiving.
            </p>
          </div>

          {/* Canvas Mode Return / Dismiss */}
          {onExitCanvas && (
            <button
              type="button"
              onClick={onExitCanvas}
              className="self-start lg:self-center px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>Exit Canvas Mode</span>
            </button>
          )}
        </div>

        {/* Live Feedback & Instructions Dock */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : feedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
            )}
            <span
              className={`font-medium ${
                feedback.type === 'error'
                  ? 'text-red-300'
                  : feedback.type === 'warning'
                  ? 'text-amber-300'
                  : feedback.type === 'success'
                  ? 'text-emerald-300'
                  : 'text-[#E1DCE9]'
              }`}
            >
              {feedback.message}
            </span>
          </div>

          {/* Quick instructions for accessibility */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#AAA0BA]">
            <Hand className="w-3.5 h-3.5 text-purple-400" />
            <span>Mouse: Drag slide to Zone • Keyboard: Space to Pick, Enter on Zone</span>
          </div>
        </div>
      </div>

      {/* ================= 2. DESIGNATED ACTION ZONES DOCK ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-text)] uppercase font-mono tracking-wider">
              Designated Action Zones
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            {evaluatedProject ? `Target Card: "${evaluatedProject.title}"` : 'Awaiting Card Drag'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* ZONE 1: REVIVE */}
          <ActionZone
            id="zone-revive"
            title="Revive Zone"
            subtitle="Start AI Revival Studio"
            icon={Zap}
            theme={{
              accent: 'bg-purple-600 text-white',
              border: 'border-purple-500/30',
              borderActive: 'border-purple-500',
              bg: 'bg-purple-950/20',
              bgActive: 'bg-purple-900/40',
              glow: 'ring-purple-500/50',
            }}
            isDraggingActive={Boolean(evaluatedProject)}
            isValidDrop={reviveValidation.valid}
            rejectionReason={reviveValidation.reason}
            pickedUpCardTitle={pickedUpProject?.title}
            onDropPayload={handleDropRevive}
          />

          {/* ZONE 2: FUSE */}
          <ActionZone
            id="zone-fuse"
            title="Fuse Zone"
            subtitle={
              stagedFuseP1
                ? `1/2 Staged: ${stagedFuseP1.title}`
                : 'Drop 2 projects to combine'
            }
            icon={Merge}
            theme={{
              accent: 'bg-cyan-600 text-white',
              border: 'border-cyan-500/30',
              borderActive: 'border-cyan-500',
              bg: 'bg-cyan-950/20',
              bgActive: 'bg-cyan-900/40',
              glow: 'ring-cyan-500/50',
            }}
            isDraggingActive={Boolean(evaluatedProject)}
            isValidDrop={fuseValidation.valid}
            rejectionReason={fuseValidation.reason}
            isStaged={Boolean(stagedFuseP1)}
            stagedTitle={`Staged: ${stagedFuseP1?.title}`}
            stagedDetails={
              <div className="space-y-1">
                <p>Drop a second distinct project slide into this zone to initialize AI Fusion.</p>
                <button
                  type="button"
                  onClick={() => setStagedFuseP1(null)}
                  className="text-[10px] text-cyan-400 underline hover:text-cyan-300"
                >
                  Clear Staged Project
                </button>
              </div>
            }
            pickedUpCardTitle={pickedUpProject?.title}
            onDropPayload={handleDropFuse}
          />

          {/* ZONE 3: INSPECT */}
          <ActionZone
            id="zone-inspect"
            title="Inspect Zone"
            subtitle="Open full Case File dossier"
            icon={Eye}
            theme={{
              accent: 'bg-blue-600 text-white',
              border: 'border-blue-500/30',
              borderActive: 'border-blue-500',
              bg: 'bg-blue-950/20',
              bgActive: 'bg-blue-900/40',
              glow: 'ring-blue-500/50',
            }}
            isDraggingActive={Boolean(evaluatedProject)}
            isValidDrop={true}
            pickedUpCardTitle={pickedUpProject?.title}
            onDropPayload={handleDropInspect}
          />

          {/* ZONE 4: ARCHIVE */}
          <ActionZone
            id="zone-archive"
            title="Archive Zone"
            subtitle="Move to cold storage"
            icon={Archive}
            theme={{
              accent: 'bg-amber-600 text-white',
              border: 'border-amber-500/30',
              borderActive: 'border-amber-500',
              bg: 'bg-amber-950/20',
              bgActive: 'bg-amber-900/40',
              glow: 'ring-amber-500/50',
            }}
            isDraggingActive={Boolean(evaluatedProject)}
            isValidDrop={true}
            isStaged={Boolean(stagedArchiveProject)}
            stagedTitle={`Confirm Archiving: ${stagedArchiveProject?.title}`}
            stagedDetails="This will place the project in Cold Storage and suspend active sprint access. Project data and retrospects remain preserved."
            onDropPayload={handleDropArchive}
            onDropConfirm={handleConfirmArchive}
            onCancelStaged={() => setStagedArchiveProject(null)}
            pickedUpCardTitle={pickedUpProject?.title}
          />

          {/* ZONE 5: DELETE */}
          <ActionZone
            id="zone-delete"
            title="Delete Zone"
            subtitle="Permanent removal"
            icon={Trash2}
            theme={{
              accent: 'bg-red-600 text-white',
              border: 'border-red-500/30',
              borderActive: 'border-red-500',
              bg: 'bg-red-950/20',
              bgActive: 'bg-red-900/40',
              glow: 'ring-red-500/50',
            }}
            isDraggingActive={Boolean(evaluatedProject)}
            isValidDrop={true}
            isStaged={Boolean(stagedDeleteProject)}
            stagedTitle={`Permanent Deletion: ${stagedDeleteProject?.title}`}
            stagedDetails="Irreversible Action: This permanently deletes all project milestones, tasks, and historical timeline logs. Are you sure?"
            onDropPayload={handleDropDelete}
            onDropConfirm={handleConfirmDelete}
            onCancelStaged={() => setStagedDeleteProject(null)}
            pickedUpCardTitle={pickedUpProject?.title}
          />
        </div>
      </div>

      {/* ================= 3. COMPACT FILTER & SEARCH TOOLBAR ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] dark:border-[#382B49]/50">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects to drag..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--color-surface)] dark:bg-[#17131F] border border-[var(--color-border)] dark:border-[#382B49] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--color-surface)] dark:bg-[#17131F] border border-[var(--color-border)] dark:border-[#382B49] text-xs text-[var(--color-text)] focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'active', 'paused', 'completed', 'revivable'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Optional Presentation Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl border border-[var(--color-border)] dark:border-[#382B49] bg-[var(--color-surface)] dark:bg-[#17131F]">
            <button
              type="button"
              onClick={() => setPresentationMode('showcase')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                presentationMode === 'showcase'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              title="Glass-Slide Showcase Mode"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPresentationMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                presentationMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              title="Compact Card Grid Mode"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 4. GLASS-SLIDE SHOWCASE CAROUSEL (DEFAULT PRESENTATION) ================= */}
      {presentationMode === 'showcase' ? (
        <div
          ref={showcaseContainerRef}
          className="relative rounded-3xl border transition-all duration-200 ease-out border-[#D8CFE6] dark:border-[#382B49] hover:border-[#8B2FE8] dark:hover:border-[#C026D3] focus-within:border-[#8B2FE8] dark:focus-within:border-[#C026D3] hover:shadow-[0_16px_48px_rgba(0,0,0,0.06),0_0_24px_rgba(139,47,232,0.12)] dark:hover:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(192,38,211,0.18)] focus-within:shadow-[0_16px_48px_rgba(0,0,0,0.06),0_0_24px_rgba(139,47,232,0.12)] dark:focus-within:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(192,38,211,0.18)] p-5 sm:p-7 md:p-8 bg-[#FFFFFF]/95 dark:bg-[#0E0A16] shadow-xl space-y-6"
        >
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--color-surface-subtle)] dark:bg-[#17131F]/50 border border-dashed border-[var(--color-border)] dark:border-[#382B49]">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                No projects match your filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Carousel Top Bar: Active Item & Navigation Chevrons */}
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                    Draggable Glass Slide
                  </span>
                  <span className="text-[var(--color-text-secondary)] font-semibold">
                    PROJECT{' '}
                    <strong className="text-[var(--color-text)] font-bold">
                      {safeIndex + 1 < 10 ? `0${safeIndex + 1}` : safeIndex + 1}
                    </strong>{' '}
                    / {filteredProjects.length < 10 ? `0${filteredProjects.length}` : filteredProjects.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[var(--color-text-muted)] hidden md:inline">
                    Drag card upward into Action Zones
                  </span>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={filteredProjects.length <= 1}
                    className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text)] transition-colors cursor-pointer"
                    aria-label="Previous Project"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={filteredProjects.length <= 1}
                    className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text)] transition-colors cursor-pointer"
                    aria-label="Next Project"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Virtual 5-Slot Carousel Stage */}
              <div className="relative w-full overflow-hidden py-2 select-none">
                {/* Edge atmospheric fade masks */}
                <div className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none bg-gradient-to-r from-[#FFFFFF] dark:from-[#0E0A16] to-transparent opacity-60 hidden md:block" />
                <div className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none bg-gradient-to-l from-[#FFFFFF] dark:from-[#0E0A16] to-transparent opacity-60 hidden md:block" />

                <div
                  className="flex items-center"
                  style={{
                    transform: `translateX(calc(${baseTrackOffset}% + ${trackTranslation}%))`,
                    transition: animDirection
                      ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)'
                      : 'none',
                    willChange: 'transform',
                  }}
                >
                  {circularSlots.map((slot) => {
                    const { offset, project } = slot;
                    const isCenter = offset === 0;
                    const isLeftPeek = offset === -1;
                    const isRightPeek = offset === 1;
                    const isFar = Math.abs(offset) > 1;
                    const isPickedUp = pickedUpProject?.id === project.id;
                    const isDragging = activeDragProject?.id === project.id;

                    return (
                      <div
                        key={`${project.id}-${offset}`}
                        style={{
                          width: `${slideWidthPct}%`,
                          marginRight: `${gapPct}%`,
                          flexShrink: 0,
                        }}
                        className={`transition-all ${
                          animDirection
                            ? 'duration-[220ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]'
                            : ''
                        } ${
                          isCenter
                            ? 'scale-100 opacity-100 z-10'
                            : isFar
                            ? 'opacity-0 pointer-events-none scale-75'
                            : 'scale-[0.93] opacity-45 hover:opacity-75 cursor-pointer z-0'
                        }`}
                        onMouseEnter={() => {
                          if (isLeftPeek) handleNeighborMouseEnter('prev');
                          else if (isRightPeek) handleNeighborMouseEnter('next');
                          else handleNeighborMouseLeave();
                        }}
                        onMouseLeave={handleNeighborMouseLeave}
                        onClick={() => {
                          if (isLeftPeek) handlePrev();
                          else if (isRightPeek) handleNext();
                        }}
                      >
                        {/* Draggable Glass Slide Card */}
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, project)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(e, project)}
                          tabIndex={isCenter ? 0 : -1}
                          role="region"
                          aria-label={`Project Slide: ${project.title}. Drag into an Action Zone, or press Space to pick up.`}
                          aria-grabbed={isDragging || isPickedUp}
                          data-project-id={project.id}
                          className={`relative rounded-3xl border transition-all duration-200 overflow-hidden cursor-grab active:cursor-grabbing outline-none ${
                            isPickedUp
                              ? 'border-[#8B2FE8] dark:border-[#C026D3] ring-2 ring-[#8B2FE8]/60 dark:ring-[#C026D3]/60 shadow-[0_0_32px_rgba(139,47,232,0.25)] scale-[1.01]'
                              : isDragging
                              ? 'opacity-40 border-dashed border-[#8B2FE8] dark:border-[#C026D3]'
                              : isCenter
                              ? 'border-[#E8E2D6] dark:border-white/15 hover:border-[#8B2FE8] dark:hover:border-[#C026D3] focus-visible:border-[#8B2FE8] dark:focus-visible:border-[#C026D3] hover:shadow-[0_20px_50px_-12px_rgba(28,25,23,0.12),0_0_25px_rgba(139,47,232,0.2)] dark:hover:shadow-[0_22px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(192,38,211,0.22)] focus-visible:shadow-[0_20px_50px_-12px_rgba(28,25,23,0.12),0_0_25px_rgba(139,47,232,0.2)] dark:focus-visible:shadow-[0_22px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(192,38,211,0.22)] focus-visible:ring-2 focus-visible:ring-[#8B2FE8]/40 dark:focus-visible:ring-[#C026D3]/40 bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F5] to-[#F5F2ED] dark:from-[#241B33]/95 dark:via-[#1B1428]/95 dark:to-[#130E1F]/95 shadow-[0_20px_50px_-12px_rgba(28,25,23,0.12)] dark:shadow-[0_22px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(139,47,232,0.12)]'
                              : 'border-[#E8E2D6]/60 dark:border-white/10 hover:border-[#8B2FE8]/60 dark:hover:border-[#C026D3]/60 focus-visible:border-[#8B2FE8]/70 dark:focus-visible:border-[#C026D3]/70 hover:shadow-[0_0_15px_rgba(139,47,232,0.12)] bg-[#FFFDF9]/80 dark:bg-[#1C1528]/80 shadow-sm'
                          } p-6 sm:p-8 md:p-9`}
                        >
                          {/* Glossy Top Sheen Edge */}
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent pointer-events-none" />

                          {/* Visual Picked-Up / Staged Indicator Pill */}
                          {isPickedUp && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-purple-600 text-white text-[11px] font-mono uppercase tracking-wider font-bold shadow-lg flex items-center gap-1.5 animate-bounce">
                              <Sparkles className="w-3.5 h-3.5" />
                              Card Selected • Drop on an Action Zone Above
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                            {/* Left Column: Project Cover / Generative Vector Artwork */}
                            <div className="lg:col-span-5 w-full pointer-events-none">
                              <ProjectArtwork project={project} />
                            </div>

                            {/* Right Column: Project Narrative Dossier & Drag Affordances */}
                            <div className="lg:col-span-7 space-y-4">
                              {/* Metadata & Drag Control Strip */}
                              <div className="flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge status={project.status} size="md" />
                                  <Badge variant="tech" size="sm">
                                    {project.category}
                                  </Badge>
                                  <span className="text-xs text-[#57534E] dark:text-[#BDB5CC] flex items-center gap-1 font-mono">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Planted {formatPlantedDate(project.startDate)}
                                  </span>
                                </div>

                                {/* Drag Grip Affordance & Pick-up Button */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs font-mono font-semibold">
                                    <GripVertical className="w-3.5 h-3.5 text-purple-500" />
                                    <span className="hidden sm:inline">Drag to Zone</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePickUp(project);
                                    }}
                                    className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isPickedUp
                                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                                        : 'bg-black/5 dark:bg-white/10 hover:bg-purple-500/20 text-[var(--color-text)] border border-black/5 dark:border-white/10'
                                    }`}
                                    aria-pressed={isPickedUp}
                                  >
                                    <Hand className="w-3.5 h-3.5" />
                                    <span>{isPickedUp ? 'Holding Card' : 'Pick Up'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Title */}
                              <h3
                                className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#1C1917] dark:text-[#F8F7FB] leading-tight"
                                style={{ fontFamily: 'var(--font-display)' }}
                              >
                                {project.title}
                              </h3>

                              {/* Summary */}
                              <p className="text-sm text-[#44403C] dark:text-[#E1DCE9] leading-relaxed line-clamp-3">
                                {project.summary || 'No summary recorded.'}
                              </p>

                              {/* Tech Ecosystem */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#57534E] dark:text-[#BDB5CC]">
                                  Tech Ecosystem
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {project.languages.concat(project.frameworks).slice(0, 4).map((tech) => (
                                    <Badge key={tech} variant="tech" size="sm">
                                      {tech}
                                    </Badge>
                                  ))}
                                  {project.tools.slice(0, 2).map((t) => (
                                    <span
                                      key={t}
                                      className="text-xs px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[#57534E] dark:text-[#BDB5CC] border border-black/5 dark:border-white/10 font-mono"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Progress Snapshot */}
                              <div className="space-y-1.5 pt-1.5 border-t border-[#E8E2D6] dark:border-white/10">
                                <div className="flex items-center justify-between text-xs font-mono text-[#57534E] dark:text-[#BDB5CC]">
                                  <span>Weighted Progress</span>
                                  <span className="font-bold text-[#1C1917] dark:text-[#F8F7FB]">
                                    {project.progress}%
                                  </span>
                                </div>
                                <ProgressBar value={project.progress} size="xs" />
                                <div className="flex items-center gap-3 text-xs font-mono text-[#57534E] dark:text-[#BDB5CC] pt-0.5">
                                  <span>{project.milestones.length} Milestones</span>
                                  <span>•</span>
                                  <span>
                                    {project.technicalBlockers.length === 0 ? (
                                      <span className="text-[var(--color-success)] inline-flex items-center gap-1 font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> 0 Blockers
                                      </span>
                                    ) : (
                                      <span className="text-[var(--color-warning)] inline-flex items-center gap-1 font-semibold">
                                        {project.technicalBlockers.length} Blockers
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Target Action Zones Guide */}
                              <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#57534E] dark:text-[#BDB5CC] border-t border-[#E8E2D6] dark:border-white/10">
                                <span className="text-[11px] truncate">
                                  Targets: <strong>Revive</strong> • <strong>Fuse</strong> • <strong>Inspect</strong> • <strong>Archive</strong> • <strong>Delete</strong>
                                </span>
                                <span className="text-purple-600 dark:text-purple-400 font-semibold inline-flex items-center gap-1 shrink-0">
                                  Drag into zone above <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compact Thumbnail Navigation Strip */}
              {filteredProjects.length > 1 && (
                <div className="pt-2">
                  <div
                    ref={thumbnailStripRef}
                    className="flex items-center gap-2.5 overflow-x-auto py-2.5 px-1 scrollbar-none scroll-smooth"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--color-text-muted)] shrink-0 pr-1 flex items-center gap-1">
                      Slides:
                    </span>
                    {filteredProjects.map((p, idx) => {
                      const isCurrent = idx === safeIndex;
                      return (
                        <button
                          key={p.id}
                          data-thumb-index={idx}
                          onClick={() => {
                            if (idx === safeIndex) return;
                            setCurrentIndex(idx);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shrink-0 cursor-pointer ${
                            isCurrent
                              ? 'bg-purple-600 text-white border-purple-500 shadow-sm scale-105'
                              : 'bg-[var(--color-surface)] dark:bg-[#17131F] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-purple-500/40'
                          }`}
                        >
                          <span className="font-bold">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <span className="truncate max-w-[120px] font-sans font-medium">
                            {p.title}
                          </span>
                          <Badge status={p.status} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= OPTIONAL COMPACT GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <DraggableProjectCard
              key={project.id}
              project={project}
              isDragging={activeDragProject?.id === project.id}
              isPickedUp={pickedUpProject?.id === project.id}
              onPickUp={handlePickUp}
              onDragStart={(e, p) => setActiveDragProject(p)}
              onDragEnd={() => setActiveDragProject(null)}
              onTouchStart={handleTouchStart}
            />
          ))}
        </div>
      )}

      {/* FLOATING TOUCH FOLLOWER FOR MOBILE / TOUCH DEVICES */}
      {touchDraggingProject && touchPos && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-xl bg-purple-600 text-white shadow-2xl flex items-center gap-2 -translate-x-1/2 -translate-y-12"
          style={{ left: touchPos.x, top: touchPos.y }}
        >
          <Sparkles className="w-4 h-4 animate-spin" />
          <span className="text-xs font-bold">{touchDraggingProject.title}</span>
        </div>
      )}
    </div>
  );
}

export default ActionCanvas;
