import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui';
import { BrandMark } from './BrandMark';

interface StartupScreenProps {
  /** Minimum visible display duration in ms before dismissing (default: 3000ms) */
  minDuration?: number;
  /** Maximum wait time in ms before showing a stalled-connection recovery prompt (default: 7000ms) */
  stalledTimeout?: number;
  /** Optional callback when startup screen has fully faded out */
  onComplete?: () => void;
}

export function StartupScreen({
  minDuration = 3000,
  stalledTimeout = 7000,
  onComplete,
}: StartupScreenProps) {
  const isNoSplash = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nosplash');
  const { initialized, initError, isSyncing, reloadAll } = useApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // 1. Minimum display duration guard: exactly 3000ms (3.0s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  // 2. Watchdog timeout for stalled initialization (7000ms = 7.0s)
  useEffect(() => {
    if (initialized || initError) return;

    const watchdog = setTimeout(() => {
      setTimedOut(true);
    }, stalledTimeout);

    return () => clearTimeout(watchdog);
  }, [initialized, initError, stalledTimeout]);

  // 3. Working retry action handler
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setTimedOut(false);
    setMinTimeElapsed(false);

    try {
      await reloadAll();
    } finally {
      setIsRetrying(false);
      setTimeout(() => {
        setMinTimeElapsed(true);
      }, 1000);
    }
  }, [reloadAll]);

  // 4. Dismissal condition
  const isDismissed = minTimeElapsed && initialized && !initError && !timedOut;

  // 5. State-aware status feedback
  let statusText = 'Preparing your workspace…';
  if (isSyncing) {
    statusText = 'Loading your projects…';
  } else if (initialized) {
    statusText = 'Almost ready…';
  }

  const effectiveError = initError || (timedOut ? 'Workspace initialization took longer than expected.' : null);

  if (isNoSplash) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!isDismissed && (
        <motion.div
          key="startup-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: {
              duration: shouldReduceMotion ? 0.05 : 0.45,
              ease: 'easeOut',
            },
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none overflow-hidden"
          style={{
            backgroundColor: '#050408',
            backgroundImage:
              'radial-gradient(ellipse 75% 65% at 50% 38%, rgba(139, 47, 232, 0.32) 0%, rgba(192, 38, 211, 0.16) 42%, rgba(69, 104, 220, 0.08) 65%, #050408 100%)',
          }}
          role="region"
          aria-label="Application loading screen"
        >
          {/* Centered content group slightly elevated for optical balance */}
          <div className="flex flex-col items-center max-w-xl w-full text-center px-4 -mt-6 sm:-mt-8">
            {/* Luminous Logo Focal Point with Layered Purple/Magenta Glow */}
            <div className="relative flex items-center justify-center">
              {/* Layer 1: Outer Broad Ambient Violet Halo */}
              <div
                className="absolute -inset-12 sm:-inset-20 rounded-full pointer-events-none blur-3xl opacity-45"
                style={{
                  background:
                    'radial-gradient(circle, rgba(139, 47, 232, 0.5) 0%, rgba(192, 38, 211, 0.25) 45%, rgba(69, 104, 220, 0.12) 65%, transparent 75%)',
                }}
              />

              {/* Layer 2: Inner Concentrated Luminous Aura */}
              <motion.div
                className="absolute -inset-4 sm:-inset-6 rounded-3xl pointer-events-none blur-xl opacity-65"
                style={{
                  background:
                    'radial-gradient(circle, rgba(192, 38, 211, 0.7) 0%, rgba(139, 47, 232, 0.4) 55%, transparent 80%)',
                }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 0.5 }
                    : {
                        scale: [0.96, 1.06, 0.96],
                        opacity: [0.5, 0.75, 0.5],
                      }
                }
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Layer 3: Vector Brand Mark Tile (92px mobile, 112px desktop) */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                <BrandMark />
              </motion.div>
            </div>

            {/* Typography Hierarchy with Deliberate Breathing Room */}
            <div className="mt-6 sm:mt-8 space-y-3">
              {/* Title: 28-32px on mobile, 36-42px on desktop */}
              <motion.h1
                initial={shouldReduceMotion ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: shouldReduceMotion ? 0 : 0.12 }}
                className="text-3xl sm:text-4xl md:text-[40px] font-normal sm:font-medium text-[#F8F6FC] tracking-tight leading-tight whitespace-normal sm:whitespace-nowrap"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                The Project Graveyard
              </motion.h1>

              {/* Tagline: 16-18px with comfortable 480-520px constrained width */}
              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: shouldReduceMotion ? 0 : 0.2 }}
                className="text-base sm:text-lg text-[#AAA0BA] font-normal leading-relaxed max-w-[480px] sm:max-w-[520px] mx-auto"
              >
                Revive ideas. Build together. Complete what matters.
              </motion.p>
            </div>

            {/* Bottom Section: Error Recovery OR Calm 3-Dot Pulse Loader */}
            {effectiveError ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 p-5 w-full max-w-md mx-auto rounded-2xl bg-[#17131F] border border-[#382B49] shadow-2xl text-center mt-8"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Connection Issue</span>
                </div>
                <p className="text-xs sm:text-sm text-[#AAA0BA] leading-normal break-words">
                  {effectiveError}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
                >
                  {isRetrying ? 'Retrying…' : 'Retry Initialization'}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.35,
                  delay: shouldReduceMotion ? 0 : 0.28,
                }}
                className="flex flex-col items-center gap-3 mt-8 sm:mt-10"
              >
                {/* Refined Three Dots with Even Spacing & Subtle Pulse */}
                <div className="flex items-center gap-2.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: i === 1 ? '#C026D3' : '#8B2FE8',
                        boxShadow: i === 1 ? '0 0 10px #C026D3' : '0 0 8px #8B2FE8',
                      }}
                      animate={
                        shouldReduceMotion
                          ? { opacity: 0.7 }
                          : {
                              opacity: [0.35, 1, 0.35],
                              scale: [0.85, 1.25, 0.85],
                            }
                      }
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: i * 0.22,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>

                {/* State-Aware Accessible Status Label */}
                <div
                  role="status"
                  aria-live="polite"
                  className="text-xs sm:text-sm text-[#C026D3] font-medium tracking-wide"
                >
                  {statusText}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default StartupScreen;
