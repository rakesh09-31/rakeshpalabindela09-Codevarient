import React, { useState } from 'react';
import {
  Globe,
  Terminal,
  BookOpen,
  Sparkles,
  Layers,
  Cpu,
  LucideIcon,
} from 'lucide-react';
import { Project } from '../../types';

export interface CategoryTheme {
  gradientLight: string;
  gradientDark: string;
  accentLight: string;
  accentDark: string;
  borderLight: string;
  borderDark: string;
  icon: LucideIcon;
  codeSnippet: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  'Climate & Sustainability': {
    gradientLight: 'from-emerald-50 via-teal-50 to-stone-100',
    gradientDark: 'from-emerald-950/70 via-teal-950/40 to-stone-900',
    accentLight: 'text-emerald-700',
    accentDark: 'text-emerald-400',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-800/40',
    icon: Globe,
    codeSnippet: 'telemetry::geofence_offsets()',
  },
  'Developer Tools': {
    gradientLight: 'from-sky-50 via-indigo-50 to-stone-100',
    gradientDark: 'from-sky-950/70 via-indigo-950/40 to-stone-900',
    accentLight: 'text-indigo-700',
    accentDark: 'text-indigo-400',
    borderLight: 'border-indigo-200',
    borderDark: 'border-indigo-800/40',
    icon: Terminal,
    codeSnippet: 'git::diff_ast_symbols()',
  },
  'Education & Productivity': {
    gradientLight: 'from-amber-50 via-orange-50 to-stone-100',
    gradientDark: 'from-amber-950/70 via-orange-950/40 to-stone-900',
    accentLight: 'text-amber-800',
    accentDark: 'text-amber-400',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-800/40',
    icon: BookOpen,
    codeSnippet: 'session::pomodoro_sync()',
  },
  'Generative Audio & Media': {
    gradientLight: 'from-fuchsia-50 via-purple-50 to-stone-100',
    gradientDark: 'from-fuchsia-950/70 via-purple-950/40 to-stone-900',
    accentLight: 'text-fuchsia-700',
    accentDark: 'text-fuchsia-400',
    borderLight: 'border-fuchsia-200',
    borderDark: 'border-fuchsia-800/40',
    icon: Sparkles,
    codeSnippet: 'synth::web_audio_mesh()',
  },
  'Open Source & Infrastructure': {
    gradientLight: 'from-blue-50 via-slate-50 to-stone-100',
    gradientDark: 'from-blue-950/70 via-slate-950/40 to-stone-900',
    accentLight: 'text-blue-700',
    accentDark: 'text-blue-400',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-800/40',
    icon: Layers,
    codeSnippet: 'kernel::runtime_alloc()',
  },
  'Hardware & IoT': {
    gradientLight: 'from-cyan-50 via-zinc-50 to-stone-100',
    gradientDark: 'from-cyan-950/70 via-zinc-950/40 to-stone-900',
    accentLight: 'text-cyan-700',
    accentDark: 'text-cyan-400',
    borderLight: 'border-cyan-200',
    borderDark: 'border-cyan-800/40',
    icon: Cpu,
    codeSnippet: 'gpio::serial_packet()',
  },
};

export function ProjectArtwork({
  project,
  onClick,
  compact = false,
}: {
  project: Project;
  onClick?: () => void;
  compact?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const theme = CATEGORY_THEMES[project.category] || {
    gradientLight: 'from-stone-50 via-neutral-100 to-stone-100',
    gradientDark: 'from-neutral-900 via-stone-900 to-zinc-950',
    accentLight: 'text-stone-700',
    accentDark: 'text-stone-300',
    borderLight: 'border-stone-200',
    borderDark: 'border-stone-800',
    icon: Layers,
    codeSnippet: 'project::archive_entry()',
  };
  const Icon = theme.icon;

  const hasAttachmentImage =
    !imageError &&
    project.attachments &&
    project.attachments.length > 0 &&
    project.attachments[0].url;

  if (hasAttachmentImage) {
    return (
      <div
        onClick={onClick}
        className={`relative w-full ${compact ? 'aspect-[16/9]' : 'aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3]'} rounded-2xl md:rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 group shadow-xs select-none`}
      >
        <img
          src={project.attachments![0].url}
          alt={project.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full ${compact ? 'aspect-[16/9] p-3' : 'aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] p-5 sm:p-6'} rounded-2xl md:rounded-3xl bg-gradient-to-br ${theme.gradientLight} dark:${theme.gradientDark} border ${theme.borderLight} dark:${theme.borderDark} flex flex-col justify-between overflow-hidden shadow-xs group transition-all duration-300 select-none`}
    >
      {/* Glossy Diagonal Reflection Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 dark:via-white/10 to-transparent pointer-events-none" />

      {/* Decorative Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(currentColor 1px, transparent 1px), radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      />

      {/* Top Monograph Bar */}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#57534E] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md border border-black/5 dark:border-white/10">
          CASE #{project.id.toUpperCase()}
        </span>

        <span className="text-[10px] font-mono text-[#57534E] dark:text-[#BDB5CC] bg-white/80 dark:bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md border border-black/5 dark:border-white/10 flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{project.category}</span>
        </span>
      </div>

      {/* Centerpiece Vector Icon & Abstract Monogram */}
      <div className="relative z-10 my-auto text-center space-y-1.5 py-1">
        <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16'} rounded-2xl bg-white/90 dark:bg-black/50 backdrop-blur-sm border border-black/5 dark:border-white/15 mx-auto flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}>
          <Icon className={`${compact ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8'} ${theme.accentLight} dark:${theme.accentDark}`} />
        </div>
        {!compact && (
          <div className="font-mono text-[11px] text-[#57534E] dark:text-[#BDB5CC]">
            <code>{theme.codeSnippet}</code>
          </div>
        )}
      </div>

      {/* Bottom Technical Strip */}
      <div className="flex items-center justify-between relative z-10 pt-1.5 border-t border-black/5 dark:border-white/10 text-[9px] sm:text-[10px] font-mono text-[#57534E] dark:text-[#BDB5CC]">
        <span className="truncate max-w-[65%]">
          {project.languages.concat(project.frameworks).slice(0, 2).join(' • ') || 'Prototype'}
        </span>
        <span className="font-semibold uppercase tracking-wider">
          {project.status} • {project.progress}%
        </span>
      </div>
    </div>
  );
}
