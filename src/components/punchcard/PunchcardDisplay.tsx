'use client';

import { cn } from '@/lib/utils';

interface PunchcardDisplayProps {
  currentPunches: number;
  requiredPunches: number;
  className?: string;
}

export function PunchcardDisplay({
  currentPunches,
  requiredPunches,
  className,
}: PunchcardDisplayProps) {
  const remaining = requiredPunches - currentPunches;
  const progress = (currentPunches / requiredPunches) * 100;
  const isComplete = currentPunches >= requiredPunches;

  return (
    <div
      className={cn(
        'rounded-2xl p-4 border',
        isComplete
          ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30'
          : 'bg-card border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-semibold">Punchcard</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {currentPunches}/{requiredPunches}
        </span>
      </div>

      {/* Punch Grid */}
      <div className="grid grid-cols-10 gap-1.5 mb-3">
        {Array.from({ length: requiredPunches }).map((_, i) => {
          const isPunched = i < currentPunches;
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-full transition-all',
                isPunched
                  ? 'bg-primary'
                  : 'bg-muted border border-border'
              )}
            />
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete ? 'bg-accent' : 'bg-primary'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Status */}
      <p className="mt-2 text-center text-sm">
        {isComplete ? (
          <span className="font-medium text-accent">Ready for a reward!</span>
        ) : (
          <span className="text-muted-foreground">{remaining} more to go</span>
        )}
      </p>
    </div>
  );
}
