'use client';

import { cn } from '@/lib/utils';
import { getPunchcardColor } from '@/lib/utils/colors';
import type { HabitWithPunchcard } from '@/types';

interface TicketPunchcardProps {
  habit: HabitWithPunchcard;
  colorIndex: number;
  onClaim: () => void;
  isClaiming: boolean;
}

export function TicketPunchcard({
  habit,
  colorIndex,
  onClaim,
  isClaiming,
}: TicketPunchcardProps) {
  const color = getPunchcardColor(colorIndex);
  const totalHoles = habit.punchcard_target;
  const filledHoles = habit.punchcard_current;
  const remaining = totalHoles - filledHoles;
  const progress = totalHoles > 0 ? (filledHoles / totalHoles) * 100 : 0;
  const isComplete = filledHoles >= totalHoles;

  // Calculate grid columns based on total holes
  const cols = totalHoles <= 7 ? totalHoles : totalHoles <= 14 ? 7 : 10;

  return (
    <div className="relative overflow-hidden">
      {/* Ticket container */}
      <div
        className="rounded-xl p-6 border-2 relative"
        style={{
          background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
          borderColor: color.border,
        }}
      >
        {/* Ticket notches on sides */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-r-full -ml-1.5" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-l-full -mr-1.5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Ticket icon */}
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
              <circle cx="2" cy="12" r="1.5" fill="white" />
              <circle cx="22" cy="12" r="1.5" fill="white" />
            </svg>
            <div>
              <span className="font-bold text-white drop-shadow-sm">{habit.name}</span>
              {habit.category && (
                <div className="text-xs text-white/80 mt-0.5">
                  {habit.category.icon} {habit.category.name}
                </div>
              )}
            </div>
          </div>

          {/* Claim button (only when complete) */}
          {isComplete && (
            <button
              onClick={onClaim}
              disabled={isClaiming}
              className="px-4 py-2 bg-white text-sm font-bold rounded-lg shadow-md hover:bg-white/90 transition-colors disabled:opacity-50"
              style={{ color: color.border }}
            >
              {isClaiming ? 'Claiming...' : 'Claim'}
            </button>
          )}
        </div>

        {/* Progress badge */}
        <div className="mb-3">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white">
            {filledHoles}/{totalHoles} completions
          </span>
        </div>

        {/* Punch Grid */}
        <div
          className="grid gap-2 mb-4"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: totalHoles }).map((_, i) => {
            const isPunched = i < filledHoles;

            return (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-full flex items-center justify-center text-sm relative overflow-visible',
                  isPunched
                    // PUNCHED: White hole with strong shadow for depth
                    ? 'bg-white dark:bg-slate-200 shadow-lg'
                    // UNPUNCHED: High contrast border with shadow
                    : 'border-[3px] border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]'
                )}
                style={!isPunched ? {
                  background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                } : undefined}
              >
                {/* Show checkmark in punched holes */}
                {isPunched && (
                  <span className="text-xs font-bold opacity-50" style={{ color: color.border }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500 bg-white"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Status */}
        <p className="text-center text-sm font-medium">
          {isComplete ? (
            <span className="text-white drop-shadow-sm">Ready to claim! 🎉</span>
          ) : (
            <span className="text-white/90">{remaining} more to go</span>
          )}
        </p>

        {/* Reward info */}
        {habit.reward_type && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-white/80 text-center">
              {habit.reward_type === 'direct'
                ? `Reward: ${habit.reward_text || 'Custom reward'}`
                : 'Reward: Random from jackpot'}
            </p>
          </div>
        )}
      </div>

      {/* CSS for animations */}
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
      `}</style>
    </div>
  );
}
