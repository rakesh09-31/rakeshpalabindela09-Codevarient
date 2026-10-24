import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Sanitizes stack traces and error messages to remove sensitive query parameters,
 * tokens, or auth headers before displaying to user.
 */
function sanitizeErrorMessage(msg?: string | null): string {
  if (!msg) return 'An unexpected error occurred.';
  return msg
    .replace(/(bearer\s+)[a-zA-Z0-9_\-.]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|password|key)=([^&\s]+)/gi, '$1=[REDACTED]');
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Safe console logging with non-sensitive diagnostic context
    console.error('[ErrorBoundary] Caught unhandled React render error:', {
      message: error?.message,
      name: error?.name,
      componentStack: errorInfo?.componentStack?.slice(0, 1000),
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const sanitizedMessage = sanitizeErrorMessage(this.state.error?.message);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[360px] w-full flex items-center justify-center p-6 text-[var(--color-text)]"
        >
          <div className="w-full max-w-xl p-8 rounded-2xl bg-[var(--color-surface)]/90 backdrop-blur-xl border border-[var(--color-danger)]/30 shadow-2xl relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <AlertOctagon size={28} />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)] mb-1">
                  {this.props.title || 'Something went wrong in this view'}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                  Project Graveyard encountered an error while rendering this component. Your saved
                  projects and data remain intact.
                </p>

                {/* Sanitized friendly message */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs font-mono text-red-300/90 break-words mb-5">
                  {sanitizedMessage}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90 transition-colors shadow-sm"
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </button>

                  <button
                    type="button"
                    onClick={this.handleGoHome}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-active)] transition-colors"
                  >
                    <Home size={14} />
                    Go to Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-text-secondary)] transition-colors"
                  >
                    Reload App
                  </button>

                  <button
                    type="button"
                    onClick={this.toggleDetails}
                    aria-expanded={this.state.showDetails}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors py-2"
                  >
                    <span>{this.state.showDetails ? 'Hide' : 'Show'} details</span>
                    {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Technical Diagnostic Details */}
                {this.state.showDetails && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                      Component Stack Trace
                    </p>
                    <pre className="p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono text-[var(--color-text-secondary)] max-h-48 overflow-y-auto whitespace-pre-wrap break-all leading-tight">
                      {this.state.errorInfo?.componentStack || 'No stack trace available.'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
