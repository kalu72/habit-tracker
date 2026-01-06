'use client';

import { DayCell } from './DayCell';
import { formatDateKey, isToday, isPast, getDayOfWeek, DAY_NAMES } from '@/lib/dates';
import type { HabitWeeklyData, DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';

interface HabitWeekGridProps {
  habits: HabitWeeklyData[];
  weekDates: Date[];
  onToggle: (habitId: string, date: Date, isCompleted: boolean) => void;
  togglingCell: string | null; // Format: "habitId-dateKey"
  isCurrentWeek?: boolean; // Whether viewing current week (for future date blocking)
}

export function HabitWeekGrid({
  habits,
  weekDates,
  onToggle,
  togglingCell,
  isCurrentWeek = true, // Default to true for backward compatibility
}: HabitWeekGridProps) {
  if (habits.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header row with day names */}
      <div className="grid grid-cols-[1fr_repeat(7,30px)] sm:grid-cols-[1fr_repeat(7,40px)] gap-0.5 sm:gap-1 p-2 sm:p-3 border-b-2 border-sky-300/50 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20">
        <div className="text-xs font-medium text-muted-foreground">Habit</div>
        {weekDates.map((date, i) => {
          const mondayBasedNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const isTodayDate = isToday(date);

          return (
            <div
              key={i}
              className={cn(
                'text-center text-xs font-medium py-1 rounded-lg',
                isTodayDate
                  ? 'bg-yellow-400/50 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300 font-bold'
                  : 'text-muted-foreground'
              )}
            >
              <div className={cn(isTodayDate && 'font-semibold')}>{mondayBasedNames[i]}</div>
              <div className={cn(
                'text-[10px]',
                isTodayDate && 'font-bold'
              )}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Habit rows */}
      <div className="divide-y divide-border">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="grid grid-cols-[1fr_repeat(7,30px)] sm:grid-cols-[1fr_repeat(7,40px)] gap-0.5 sm:gap-1 p-2 sm:p-3 items-center"
          >
            {/* Habit name */}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{habit.name}</div>
              {habit.category && (
                <div
                  className="text-[9px] sm:text-[10px] font-medium truncate"
                  style={{ color: habit.category.color }}
                >
                  {habit.category.name}
                </div>
              )}
            </div>

            {/* Day cells */}
            {weekDates.map((date) => {
              const dateKey = formatDateKey(date);
              const dayOfWeek = getDayOfWeek(date);
              const isScheduled = habit.scheduledDaysSet.has(dayOfWeek);
              const isCompleted = habit.weekCompletions[dateKey] === true;
              const cellKey = `${habit.id}-${dateKey}`;
              const isToggling = togglingCell === cellKey;
              // Only block future dates when viewing current week
              const isFutureDate = isCurrentWeek && date > new Date();
              const isTodayDate = isToday(date);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'rounded-lg',
                    isTodayDate && isCurrentWeek && 'bg-yellow-400/20 dark:bg-yellow-500/10'
                  )}
                >
                  <DayCell
                    isScheduled={isScheduled}
                    isCompleted={isCompleted}
                    isToday={isTodayDate && isCurrentWeek}
                    isPast={isPast(date)}
                    onClick={() => onToggle(habit.id, date, isCompleted)}
                    disabled={isFutureDate}
                    isToggling={isToggling}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
