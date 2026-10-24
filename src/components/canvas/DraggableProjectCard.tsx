import React from 'react';
import { GripVertical, Sparkles } from 'lucide-react';
import { Project } from '../../types';
import { Badge } from '../ui';
import { ProjectArtwork } from '../common/ProjectArtwork';

interface DraggableProjectCardProps {
  project: Project;
  isDragging?: boolean;
  isPickedUp?: boolean;
  onPickUp?: (project: Project) => void;
  onDragStart?: (e: React.DragEvent, project: Project) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent, project: Project) => void;
}

export function DraggableProjectCard({
  project,
  isDragging = false,
  isPickedUp = false,
  onPickUp,
  onDragStart,
  onDragEnd,
  onTouchStart,
}: DraggableProjectCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
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
    onDragStart?.(e, project);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onPickUp?.(project);
    }
  };

  const allTags = [...project.languages, ...project.frameworks].slice(0, 3);

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => onTouchStart?.(e, project)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Draggable Project: ${project.title}. Status: ${project.status}. Press Space or Enter to pick up.`}
      aria-grabbed={isDragging || isPickedUp}
      data-project-id={project.id}
      className={`group relative flex flex-col justify-between rounded-2xl md:rounded-3xl p-4 sm:p-5 transition-all duration-200 select-none cursor-grab active:cursor-grabbing border ${
        isPickedUp
          ? 'bg-[var(--color-surface)] dark:bg-[#1D1726] border-purple-500 ring-2 ring-purple-500/60 shadow-xl scale-[1.02]'
          : isDragging
          ? 'opacity-40 bg-[var(--color-surface)] dark:bg-[#17131F] border-dashed border-purple-400 scale-[0.98]'
          : 'bg-[var(--color-surface)] dark:bg-[#17131F] border-[var(--color-border)] dark:border-[#382B49] hover:border-purple-500/50 hover:shadow-lg'
      }`}
    >
      {/* Visual Picked-Up / Staged Indicator Pill */}
      {isPickedUp && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-mono uppercase tracking-wider font-bold shadow-md flex items-center gap-1.5 animate-bounce">
          <Sparkles className="w-3 h-3" />
          Holding Card • Choose Zone
        </div>
      )}

      {/* Card Header: Grab Handle, Category & Status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="p-1 rounded-md text-[var(--color-text-muted)] group-hover:text-purple-400 transition-colors"
            title="Drag handle"
          >
            <GripVertical className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider truncate">
            {project.category}
          </span>
        </div>
        <Badge status={project.status} size="sm" />
      </div>

      {/* Compact Project Artwork */}
      <div className="mb-3 rounded-xl overflow-hidden pointer-events-none">
        <ProjectArtwork project={project} compact={true} />
      </div>

      {/* Content: Title & Short Summary */}
      <div className="space-y-1.5 mb-3">
        <h3 className="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight line-clamp-1 group-hover:text-purple-400 transition-colors">
          {project.title}
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
          {project.summary || 'No summary recorded.'}
        </p>
      </div>

      {/* Tech ecosystem tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-surface-subtle)] dark:bg-[#211A2D] text-[var(--color-text-muted)] border border-[var(--color-border)] dark:border-[#382B49]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Progress bar and Keyboard Pick-up Button */}
      <div className="pt-2.5 border-t border-[var(--color-border)] dark:border-[#382B49]/70 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[var(--color-surface-subtle)] dark:bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
            {project.progress}%
          </span>
        </div>

        {/* Accessible Keyboard Pick-up Trigger (also handles click-to-pick) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPickUp?.(project);
          }}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
            isPickedUp
              ? 'bg-purple-600 text-white'
              : 'bg-[var(--color-surface-subtle)] dark:bg-[#211A2D] text-[var(--color-text-body)] hover:bg-purple-500/20 hover:text-purple-300'
          }`}
          aria-pressed={isPickedUp}
        >
          {isPickedUp ? 'Selected' : 'Pick Up'}
        </button>
      </div>
    </div>
  );
}
