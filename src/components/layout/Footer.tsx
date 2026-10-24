import { Link } from 'react-router-dom';
import { Archive, Heart, Sparkles } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]/60 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand & Tagline */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="w-[32px] h-[32px] rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-[var(--color-brand-contrast)] flex items-center justify-center shadow-2xs">
              <Archive className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <p
                className="text-xs font-bold text-[var(--color-text)] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                The Project Graveyard
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Revive ideas. Build together. Complete what matters.
              </p>
            </div>
          </div>

          {/* Useful Links */}
          <div className="flex items-center gap-6 text-xs text-[var(--color-text-secondary)]">
            <Link
              to="/discover"
              className="hover:text-[var(--color-brand)] transition-colors"
            >
              Explore Archive
            </Link>
            <Link
              to="/revival-studio"
              className="hover:text-[var(--color-brand)] transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-[var(--color-accent)]" />
              Revival Studio
            </Link>
            <Link
              to="/settings"
              className="hover:text-[var(--color-brand)] transition-colors"
            >
              Settings & Preferences
            </Link>
          </div>
        </div>

        {/* Bottom subtle copyright note */}
        <div className="mt-6 pt-4 border-t border-[var(--color-border)]/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span>© {currentYear} The Project Graveyard. Unfinished ideas deserve a second life.</span>
          <span className="flex items-center gap-1">
            Built for creators & developers <Heart className="w-2.5 h-2.5 text-[var(--color-accent)] fill-[var(--color-accent)]" />
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
