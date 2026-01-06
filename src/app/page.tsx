'use client';

import { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { AppShell } from '@/components/layout';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getHabitsWithStats,
  toggleHabitCompletionForDate,
} from '@/lib/supabase/habits';
import { getWeekStart, getWeekDates, formatDateKey, DAY_NAMES_FULL, getDayOfWeek, isNthDayOfMonth } from '@/lib/dates';
import type { HabitWithStatus, DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';
import { QuotaProgress } from '@/components/habits/QuotaProgress';

const MOTIVATIONAL_QUOTES = [
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  "Small daily improvements are the key to staggering long-term results.",
  "Habits are the compound interest of self-improvement.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of your future is hidden in your daily routine.",
  "Motivation gets you started. Habit keeps you going.",
  "First we make our habits, then our habits make us.",
  "A habit cannot be tossed out the window; it must be coaxed down the stairs a step at a time.",
  "Chains of habit are too light to be felt until they are too heavy to be broken.",
  "Your net worth to the world is usually determined by what remains after your bad habits are subtracted from your good ones.",
  "Good habits formed at youth make all the difference.",
  "The only way to break a bad habit is to replace it with a better one.",
];

export default function Home() {
  const { userId, userName, isLoading: authLoading } = useAuth();
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
  );

  const refreshQuote = () => {
    setQuoteIndex(prev => {
      let next = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      // Avoid showing same quote
      while (next === prev && MOTIVATIONAL_QUOTES.length > 1) {
        next = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      }
      return next;
    });
  };

  const today = new Date();
  const dayName = DAY_NAMES_FULL[today.getDay()];
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  // Calculate week dates (Mon-Sun)
  const weekStart = useMemo(() => getWeekStart(today), []);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Helper: Get today's habits (scheduled for today)
  const getTodaysHabits = (allHabits: HabitWithStatus[]): HabitWithStatus[] => {
    const dayOfWeek = getDayOfWeek(today);
    return allHabits.filter(habit => {
      // Handle monthly_on_weeks frequency specially
      if (habit.frequency_type === 'monthly_on_weeks') {
        // Must match the configured day of week
        if (habit.monthly_day_of_week !== dayOfWeek) {
          return false;
        }
        // Must be one of the configured week occurrences
        if (!habit.monthly_week_occurrences || habit.monthly_week_occurrences.length === 0) {
          return false;
        }
        // Check if today is the Nth occurrence of this day in the month
        return habit.monthly_week_occurrences.some(weekOccurrence =>
          isNthDayOfMonth(today, habit.monthly_day_of_week!, weekOccurrence)
        );
      }

      // For all other frequency types, check scheduled_days
      const scheduledDays = habit.scheduled_days || [];
      return scheduledDays.includes(dayOfWeek);
    });
  };

  // Helper: Check if habit should be hidden due to quota
  const shouldHideHabit = (habit: HabitWithStatus): boolean => {
    if (!habit.hide_when_quota_reached) return false;

    if (habit.frequency_type === 'times_per_week') {
      return habit.completions_this_week >= habit.frequency_value;
    }
    if (habit.frequency_type === 'times_per_month') {
      return habit.completions_this_month >= habit.frequency_value;
    }
    return false;
  };

  // Helper: Check if habit is completed today
  const isHabitCompletedToday = (habit: HabitWithStatus): boolean => {
    return habit.is_completed_today;
  };

  // Get today's habits and punchcard holes
  const todaysHabits = useMemo(() => getTodaysHabits(habits), [habits]);

  // Fetch data
  const fetchData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const habitsData = await getHabitsWithStats(userId);
      setHabits(habitsData);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load habits: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  // Handle toggle for today's tasks
  const handleTodayToggle = async (habit: HabitWithStatus) => {
    if (!userId || togglingCell) return;

    const dateKey = formatDateKey(today);
    const cellKey = `${habit.id}-${dateKey}`;
    const isCompleted = isHabitCompletedToday(habit);

    // Check if this will complete all today's tasks
    const visibleHabits = todaysHabits.filter(h => !shouldHideHabit(h));
    const completedCount = visibleHabits.filter(h => isHabitCompletedToday(h)).length;
    const willCompleteAll = !isCompleted && completedCount + 1 === visibleHabits.length;

    try {
      setTogglingCell(cellKey);
      const result = await toggleHabitCompletionForDate(habit.id, userId, today, isCompleted);

      // Optimistic update - update local state instead of refetching
      setHabits(prevHabits =>
        prevHabits.map(h => {
          if (h.id === habit.id) {
            return {
              ...h,
              is_completed_today: result.newCompletionState,
              completions_today: result.newCompletionState ? h.completions_today + 1 : Math.max(0, h.completions_today - 1),
              completions_this_week: result.newCompletionState ? h.completions_this_week + 1 : Math.max(0, h.completions_this_week - 1),
              completions_this_month: result.newCompletionState ? h.completions_this_month + 1 : Math.max(0, h.completions_this_month - 1),
            };
          }
          return h;
        })
      );

      // Celebrate when all tasks are done!
      if (willCompleteAll) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Error toggling habit:', err);
    } finally {
      setTogglingCell(null);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded-lg w-40"></div>
              <div className="h-5 bg-muted rounded w-32"></div>
            </div>
            <div className="h-24 bg-muted rounded-xl"></div>
            <div className="h-48 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Error state
  if (error) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header with Quote */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">{dayName}</h1>
            <p className="text-muted-foreground">{dateStr}</p>
          </div>

          {/* Motivational Quote */}
          <div className="flex items-start gap-2 p-3 pl-4 bg-primary/5 rounded-lg border-l-4 border-primary/60 max-w-[200px]">
            <p className="flex-1 text-xs italic text-muted-foreground leading-relaxed">
              &ldquo;{MOTIVATIONAL_QUOTES[quoteIndex]}&rdquo;
            </p>
            <button
              onClick={refreshQuote}
              className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors flex-shrink-0"
              title="New quote"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {(() => {
                const visibleHabits = todaysHabits.filter(h => !shouldHideHabit(h));
                return visibleHabits.length > 0
                  ? `Today's tasks (${visibleHabits.filter(h => isHabitCompletedToday(h)).length}/${visibleHabits.length})`
                  : 'No tasks scheduled for today';
              })()}
            </h2>
            {(() => {
              const visibleHabits = todaysHabits.filter(h => !shouldHideHabit(h));
              return visibleHabits.length > 0 && (
                <Progress
                  value={(visibleHabits.filter(h => isHabitCompletedToday(h)).length / visibleHabits.length) * 100}
                  className="w-20 h-2 bg-green-200 [&>div]:bg-green-400"
                />
              );
            })()}
          </div>

          {todaysHabits.length === 0 && habits.length === 0 && (
            <div className="text-center py-8 px-4 bg-card border border-border rounded-xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-3">No habits yet</p>
              <a
                href="/habits"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create your first habit
              </a>
            </div>
          )}

          {/* Incomplete Tasks - Dynamic Grid */}
          {(() => {
            const incompleteHabits = todaysHabits.filter(h => !isHabitCompletedToday(h) && !shouldHideHabit(h));
            const completedHabits = todaysHabits.filter(h => isHabitCompletedToday(h) && !shouldHideHabit(h));
            const columns = Math.min(4, Math.ceil(incompleteHabits.length / 4)) || 1;
            const isMultiColumn = columns > 1;

            return (
              <>
                {/* Incomplete tasks grid */}
                {incompleteHabits.length > 0 && (
                  <div className={cn(
                    'grid gap-2',
                    columns === 1 && 'grid-cols-1',
                    columns === 2 && 'grid-cols-2',
                    columns === 3 && 'grid-cols-3',
                    columns >= 4 && 'grid-cols-4'
                  )}>
                    {incompleteHabits.map((habit) => {
                      const dateKey = formatDateKey(today);
                      const cellKey = `${habit.id}-${dateKey}`;
                      const isToggling = togglingCell === cellKey;
                      const categoryColor = habit.category?.color || '#8b5cf6';

                      return (
                        <button
                          key={habit.id}
                          onClick={() => handleTodayToggle(habit)}
                          disabled={isToggling}
                          className={cn(
                            'flex items-center gap-2 rounded-xl border text-left transition-all relative overflow-hidden',
                            isMultiColumn ? 'p-2 flex-col' : 'p-4 gap-4'
                          )}
                          style={{
                            backgroundColor: `${categoryColor}15`,
                            borderColor: `${categoryColor}30`,
                          }}
                        >
                          {/* Streak badge - bottom right corner */}
                          {habit.current_streak > 3 && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-80">
                              <span className="text-xs">🔥</span>
                              <span className="text-xs font-semibold">{habit.current_streak}x</span>
                            </div>
                          )}
                          {/* Checkbox */}
                          <div
                            className={cn(
                              'rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all border-current/30',
                              isMultiColumn ? 'w-5 h-5' : 'w-6 h-6'
                            )}
                            style={{ borderColor: `${categoryColor}50` }}
                          >
                            {isToggling && (
                              <div
                                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: categoryColor, borderTopColor: 'transparent' }}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className={cn(
                            'min-w-0',
                            isMultiColumn ? 'text-center w-full' : 'flex-1'
                          )}>
                            <div className={cn(
                              'flex items-center gap-2',
                              isMultiColumn ? 'flex-col' : 'flex-row flex-wrap'
                            )}>
                              <span className={cn(
                                'font-medium',
                                isMultiColumn ? 'text-xs line-clamp-2' : 'text-sm'
                              )}>
                                {habit.name}
                              </span>
                              {!isMultiColumn && habit.category && (
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${categoryColor}25`,
                                    color: categoryColor,
                                  }}
                                >
                                  {habit.category.name}
                                </span>
                              )}
                            </div>
                            <QuotaProgress
                              frequencyType={habit.frequency_type}
                              frequencyValue={habit.frequency_value}
                              completionsThisWeek={habit.completions_this_week}
                              completionsThisMonth={habit.completions_this_month}
                              isCompact={isMultiColumn}
                            />
                          </div>

                          {/* Icon (only in single column) */}
                          {!isMultiColumn && habit.category?.icon && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span
                                className="text-3xl opacity-30"
                                style={{ color: categoryColor }}
                              >
                                {habit.category.icon}
                              </span>
                            </div>
                          )}

                          {/* Icon only in multi-column */}
                          {isMultiColumn && habit.category?.icon && (
                            <span
                              className="text-xl opacity-40"
                              style={{ color: categoryColor }}
                            >
                              {habit.category.icon}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Completed tasks - Mini chips at bottom */}
                {completedHabits.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {completedHabits.map((habit) => {
                      const dateKey = formatDateKey(today);
                      const cellKey = `${habit.id}-${dateKey}`;
                      const isToggling = togglingCell === cellKey;
                      const categoryColor = habit.category?.color || '#8b5cf6';

                      return (
                        <button
                          key={habit.id}
                          onClick={() => handleTodayToggle(habit)}
                          disabled={isToggling}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all opacity-60 hover:opacity-80"
                          style={{
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor,
                          }}
                        >
                          {isToggling ? (
                            <div
                              className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                              style={{ borderColor: categoryColor, borderTopColor: 'transparent' }}
                            />
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span className="truncate max-w-[100px]">{habit.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>

      </div>
    </AppShell>
  );
}
