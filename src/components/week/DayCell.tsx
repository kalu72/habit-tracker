'use client';

import { cn } from '@/lib/utils';

interface DayCellProps {
  isScheduled: boolean;
  isCompleted: boolean;
  isToday: boolean;
  isPast: boolean;
  onClick: () => void;
  disabled?: boolean;
  isToggling?: boolean;
}

export function DayCell({
  isScheduled,
  isCompleted,
  isToday,
  isPast,
  onClick,
  disabled,
  isToggling,
}: DayCellProps) {
  // Not scheduled - show empty/muted cell
  if (!isScheduled) {
    return (
      <div className="flex items-center justify-center h-8">
        <div className="w-3 h-3 rounded-full bg-muted/30" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isToggling}
      className={cn(
        'flex items-center justify-center h-8 w-full rounded-lg transition-all',
        !disabled && !isToggling && 'hover:bg-muted/50'
      )}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center transition-all',
          isCompleted
            ? 'bg-primary text-primary-foreground'
            : 'border-2 border-muted-foreground/30',
          isPast && !isCompleted && 'border-destructive/50',
          isToggling && 'opacity-50'
        )}
      >
        {isToggling ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isCompleted ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </div>
    </button>
  );
}
