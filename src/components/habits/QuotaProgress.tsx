import type { FrequencyType } from '@/types';
import { cn } from '@/lib/utils';

interface QuotaProgressProps {
  frequencyType: FrequencyType;
  frequencyValue: number;
  completionsThisWeek: number;
  completionsThisMonth: number;
  isCompact?: boolean;
}

export function QuotaProgress({
  frequencyType,
  frequencyValue,
  completionsThisWeek,
  completionsThisMonth,
  isCompact = false,
}: QuotaProgressProps) {
  // Only show for quota-based frequency types
  if (frequencyType !== 'times_per_week' && frequencyType !== 'times_per_month') {
    return null;
  }

  // Handle edge cases
  if (!frequencyValue || frequencyValue === 0) {
    return null;
  }

  const isWeekly = frequencyType === 'times_per_week';
  const current = isWeekly ? completionsThisWeek : completionsThisMonth;
  const target = frequencyValue;
  const isComplete = current >= target;
  const timeframe = isWeekly ? 'week' : 'month';

  if (isCompact) {
    // Compact mode for multi-column layout
    return (
      <div className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded',
        isComplete
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-muted text-muted-foreground'
      )}>
        {isComplete ? '✓' : `${current}/${target}`}
      </div>
    );
  }

  // Full mode for single-column layout
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md',
      isComplete
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-muted text-muted-foreground'
    )}>
      {isComplete ? (
        <>
          <span className="text-sm">✓</span>
          <span>Complete!</span>
        </>
      ) : (
        <span>{current}/{target} this {timeframe}</span>
      )}
    </div>
  );
}
