import React, { useState } from 'react';
import { LucideIcon, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface ActionZoneProps {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  theme: {
    accent: string;
    border: string;
    borderActive: string;
    bg: string;
    bgActive: string;
    glow: string;
  };
  isDraggingActive: boolean;
  isValidDrop: boolean;
  rejectionReason?: string;
  isStaged?: boolean;
  stagedTitle?: string;
  stagedDetails?: React.ReactNode;
  onDropPayload: (rawPayload: string) => void;
  onDropConfirm?: () => void;
  onCancelStaged?: () => void;
  pickedUpCardTitle?: string | null;
  className?: string;
}

export function ActionZone({
  id,
  title,
  subtitle,
  icon: Icon,
  theme,
  isDraggingActive,
  isValidDrop,
  rejectionReason,
  isStaged = false,
  stagedTitle,
  stagedDetails,
  onDropPayload,
  onDropConfirm,
  onCancelStaged,
  pickedUpCardTitle,
  className = '',
}: ActionZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isValidDrop ? 'copy' : 'none';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if leaving to an outside element
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (raw) {
      onDropPayload(raw);
    }
  };

  // Keyboard accessibility: drop picked-up item on key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isStaged && onDropConfirm) {
        onDropConfirm();
      } else if (pickedUpCardTitle) {
        onDropPayload('__KEYBOARD_PICKED__');
      }
    } else if (e.key === 'Escape' && isStaged && onCancelStaged) {
      e.preventDefault();
      onCancelStaged();
    }
  };

  return (
    <div
      data-drop-zone={id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Action Zone: ${title}. ${subtitle}. ${isStaged ? 'Stage active, drop or click to confirm' : ''}`}
      className={`relative rounded-2xl md:rounded-3xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between select-none ${className} ${
        isStaged
          ? 'bg-amber-950/30 border-amber-500/70 ring-2 ring-amber-500/40 shadow-xl'
          : isDragOver
          ? isValidDrop
            ? `${theme.bgActive} ${theme.borderActive} ring-2 ${theme.glow} shadow-2xl scale-[1.02]`
            : 'bg-red-950/20 border-red-500/60 ring-2 ring-red-500/30'
          : isDraggingActive
          ? isValidDrop
            ? `${theme.bg} ${theme.border} ring-1 ${theme.glow} shadow-md`
            : 'opacity-40 grayscale-[40%] bg-[var(--color-surface)] dark:bg-[#120F18] border-[var(--color-border)] dark:border-[#2A2038]'
          : `${theme.bg} ${theme.border} hover:border-[var(--color-border-strong)]`
      }`}
    >
      {/* Glow highlight effect */}
      {(isDragOver && isValidDrop) || isStaged ? (
        <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      ) : null}

      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform ${
                isDragOver ? 'scale-110' : ''
              } ${isStaged ? 'bg-amber-500/20 text-amber-300' : theme.accent}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)] tracking-tight">
                {title}
              </h4>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isStaged ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
              Requires 2nd Drop
            </span>
          ) : isDraggingActive && isValidDrop ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          ) : isDraggingActive && !isValidDrop ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Ineligible
            </span>
          ) : null}
        </div>

        {/* Staged Details / Two-step Confirmation View */}
        {isStaged && stagedDetails ? (
          <div className="mt-2 p-3 rounded-xl bg-black/40 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-200">
                  {stagedTitle || 'Confirmation Required'}
                </p>
                <div className="text-[11px] text-[#D4CEE0] mt-0.5 leading-relaxed">
                  {stagedDetails}
                </div>
              </div>
            </div>

            {/* Confirm target drop box & cancel button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onDropConfirm}
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold tracking-wide shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Confirm Action (Drop or Click)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancelStaged}
                className="py-1.5 px-3 rounded-lg bg-black/40 hover:bg-black/60 text-[#AAA0BA] hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* Drag Over Rejection Warning */}
        {isDragOver && !isValidDrop && rejectionReason && (
          <div className="mt-2 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start gap-2 text-xs text-red-200">
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{rejectionReason}</span>
          </div>
        )}
      </div>

      {/* Footer / Accessible Keyboard Trigger */}
      {pickedUpCardTitle && !isStaged && isValidDrop && (
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate max-w-[60%]">
            Target for: <strong className="text-white">{pickedUpCardTitle}</strong>
          </span>
          <button
            type="button"
            onClick={() => onDropPayload('__KEYBOARD_PICKED__')}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Drop Here</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
