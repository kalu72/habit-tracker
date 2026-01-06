'use client';

import { cn } from '@/lib/utils';

export interface PunchHole {
  completed: boolean;
  categoryIcon?: string;
  categoryColor?: string;
}

interface WeeklyPunchcardProps {
  holes: PunchHole[];
  userName?: string | null;
  credits?: {
    available: number;
    claimable: number;
    claimed?: number;
  };
  className?: string;
}

export function WeeklyPunchcard({
  holes,
  userName,
  credits,
  className,
}: WeeklyPunchcardProps) {
  const totalHoles = holes.length;
  const filledHoles = holes.filter(h => h.completed).length;
  const remaining = totalHoles - filledHoles;
  const progress = totalHoles > 0 ? (filledHoles / totalHoles) * 100 : 0;
  const isComplete = filledHoles >= totalHoles && totalHoles > 0;

  // Calculate grid columns based on total holes
  const cols = totalHoles <= 7 ? totalHoles : totalHoles <= 14 ? 7 : 10;

  // Personalized title
  const title = userName ? `${userName}'s Habit Punchcard` : 'Habit Punchcard';

  if (totalHoles === 0) {
    return (
      <div className={cn('rounded-xl p-4 bg-card border border-border', className)}>
        <div className="text-center text-muted-foreground text-sm">
          No habits scheduled this week
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      {/* Ticket container with solid border */}
      <div
        className={cn(
          'rounded-xl p-4 border-2',
          isComplete
            ? 'bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-500 dark:from-yellow-600 dark:to-amber-600 dark:border-yellow-500'
            : 'bg-gradient-to-br from-amber-400 to-orange-400 border-amber-500 dark:from-amber-500 dark:to-orange-500 dark:border-amber-400'
        )}
      >
        {/* Ticket notches on sides */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-4 sm:w-3 sm:h-6 bg-background rounded-r-full -ml-1 sm:-ml-1.5" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 sm:w-3 sm:h-6 bg-background rounded-l-full -mr-1 sm:-mr-1.5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
              <circle cx="2" cy="12" r="1.5" fill="white" />
              <circle cx="22" cy="12" r="1.5" fill="white" />
            </svg>
            <span className="font-bold text-white dark:text-white drop-shadow-sm">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {credits && credits.available > 0 && (
              <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-yellow-400/70 text-yellow-900 dark:bg-yellow-600/50 dark:text-yellow-100 flex items-center gap-1">
                <div className="relative w-4 h-4">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <circle cx="12" cy="12" r="10" fill="#facc15" stroke="#eab308" strokeWidth="2"/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-bold text-yellow-800">$</span>
                  </div>
                </div>
                {credits.available}
              </span>
            )}
            <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200">
              {filledHoles}/{totalHoles}
            </span>
          </div>
        </div>

        {/* Punch Grid - REVERSED: solid circles become empty holes when punched */}
        <div
          className="grid gap-2 mb-4"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {holes.map((hole, i) => {
            const isCreditMilestone = (i + 1) % 10 === 0; // Every 10th hole (index 9, 19, 29...)

            return (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-full flex items-center justify-center text-sm relative overflow-visible',
                  hole.completed
                    // PUNCHED: White/light hole with category icon silhouette
                    ? 'bg-white dark:bg-slate-200 shadow-inner punch-hole'
                    // UNPUNCHED: Same color as card with dashed border
                    : 'bg-gradient-to-br from-amber-400 to-orange-400 dark:from-amber-500 dark:to-orange-500 border-2 sm:border-[3px] border-dashed border-amber-600 dark:border-amber-300',
                  isCreditMilestone && 'ring-2 ring-yellow-300 ring-offset-1 ring-offset-orange-400'
                )}
              >
                {/* Gold coin indicator for unpunched milestone holes */}
                {isCreditMilestone && !hole.completed && (
                  <div className="absolute inset-0 flex items-center justify-center z-5">
                    <div className="relative w-4 h-4">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-full h-full"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          fill="#facc15"
                          stroke="#eab308"
                          strokeWidth="2"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-bold text-yellow-800">$</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Show category icon in all completed holes */}
                {hole.completed && hole.categoryIcon && (
                  <span
                    className="text-base opacity-40"
                    style={{ color: hole.categoryColor || '#92400e' }}
                  >
                    {hole.categoryIcon}
                  </span>
                )}
                {/* Falling disc overlay for punch animation */}
                {hole.completed && (
                  <div className="falling-disc" />
                )}
              </div>
            );
          })}
        </div>


        {/* Main Progress Bar */}
        <div className="h-2 bg-white/30 dark:bg-white/20 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500 bg-white"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Status */}
        <p className="text-center text-sm font-medium">
          {isComplete ? (
            <span className="text-white drop-shadow-sm">Punchcard complete! Claim your reward! 🎉</span>
          ) : (
            <span className="text-white/90">{remaining} more to go this week</span>
          )}
        </p>
      </div>

      {/* CSS for punch falling animation */}
      <style jsx>{`
        @keyframes punchFall {
          0% {
            transform: rotate(0deg) translateY(0);
            opacity: 1;
          }
          25% {
            transform: rotate(-20deg) translateY(5px);
            opacity: 1;
          }
          50% {
            transform: rotate(-35deg) translateY(40px);
            opacity: 0.9;
          }
          100% {
            transform: rotate(-45deg) translateY(150px);
            opacity: 0;
          }
        }
        .falling-disc {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(to bottom right, #f59e0b, #f97316);
          border: 2px dashed #d97706;
          transform-origin: 0% 85%;
          animation: punchFall 1s ease-in forwards;
          pointer-events: none;
        }
        :global(.dark) .falling-disc {
          background: linear-gradient(to bottom right, #f59e0b, #ea580c);
          border-color: #fcd34d;
        }
      `}</style>
    </div>
  );
}
