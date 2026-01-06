'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { HabitWeekGrid } from '@/components/week';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getHabitsForWeekView,
  toggleHabitCompletionForDate,
} from '@/lib/supabase/habits';
import { getWeekStart, getWeekDates, formatDateKey } from '@/lib/dates';
import type { HabitWeeklyData } from '@/types';

import { Suspense } from 'react';

function WeekContent() {
  const { userId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [habits, setHabits] = useState<HabitWeeklyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);

  const today = new Date();

  // Get week from URL query parameter or default to current week
  const weekParam = searchParams.get('week');
  const currentWeekStart = useMemo(() => {
    if (weekParam) {
      // Parse YYYY-MM-DD format
      const [year, month, day] = weekParam.split('-').map(Number);
      const paramDate = new Date(year, month - 1, day);
      return getWeekStart(paramDate);
    }
    return getWeekStart(today);
  }, [weekParam]);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // Check if viewing current week
  const isCurrentWeek = useMemo(() => {
    const thisWeekStart = getWeekStart(today);
    return formatDateKey(currentWeekStart) === formatDateKey(thisWeekStart);
  }, [currentWeekStart]);

  // Navigate to previous/next week
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    const weekKey = formatDateKey(newWeekStart);
    router.push(`/week?week=${weekKey}`);
  }, [currentWeekStart, router]);

  // Jump to current week
  const goToCurrentWeek = useCallback(() => {
    router.push('/week');
  }, [router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const habitsData = await getHabitsForWeekView(userId, currentWeekStart);
      setHabits(habitsData);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load habits: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentWeekStart]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Handle toggle from grid
  const handleGridToggle = async (habitId: string, date: Date, isCompleted: boolean) => {
    if (!userId || togglingCell) return;

    // Don't allow toggling future dates (only when viewing current week)
    if (isCurrentWeek && date > today) return;

    const dateKey = formatDateKey(date);
    const cellKey = `${habitId}-${dateKey}`;

    try {
      setTogglingCell(cellKey);
      const result: { newCompletionState: boolean; creditsAdjusted?: boolean } =
        await toggleHabitCompletionForDate(habitId, userId, date, isCompleted);

      // Optimistic update
      setHabits(prevHabits =>
        prevHabits.map(h => {
          if (h.id === habitId) {
            return {
              ...h,
              weekCompletions: {
                ...h.weekCompletions,
                [dateKey]: result.newCompletionState
              }
            };
          }
          return h;
        })
      );

      // Log if credits were adjusted
      if (result.creditsAdjusted) {
        console.log('Credits adjusted due to habit uncheck');
      }
    } catch (err) {
      console.error('Error toggling habit:', err);
    } finally {
      setTogglingCell(null);
    }
  };

  // Format week range for display (e.g., "Jan 6 - Jan 12, 2026")
  const weekRangeText = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (start.getMonth() === end.getMonth()) {
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    } else {
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
  }, [weekDates]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-lg w-32"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
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
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {isCurrentWeek ? 'This Week' : weekRangeText}
            </h1>
            <p className="text-sm text-muted-foreground">{weekRangeText}</p>
            {!isCurrentWeek && (
              <button
                onClick={goToCurrentWeek}
                className="text-xs text-primary hover:underline mt-1"
              >
                Go to current week
              </button>
            )}
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-12 px-4 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground mb-3">No habits yet</p>
            <a
              href="/habits"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Create your first habit
            </a>
          </div>
        ) : (
          <HabitWeekGrid
            habits={habits}
            weekDates={weekDates}
            onToggle={handleGridToggle}
            togglingCell={togglingCell}
            isCurrentWeek={isCurrentWeek}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function WeekPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-lg w-32"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    }>
      <WeekContent />
    </Suspense>
  );
}
