import { supabase } from './client';
import type {
  Habit,
  HabitWithStatus,
  HabitWeeklyData,
  WeeklyPunchcardStats,
  FrequencyType,
  DayOfWeek,
  CreateHabitInput as CreateHabitInputBase
} from '@/types';
import { formatDateKey, getWeekDates, getDayOfWeek, isNthDayOfMonth } from '@/lib/dates';

export interface CreateHabitInput extends CreateHabitInputBase {
  user_id: string;
}

// Get all habits for a user with completion stats
export async function getHabitsWithStats(userId: string): Promise<HabitWithStatus[]> {
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get habits with category info
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select(`
      *,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (habitsError) throw habitsError;
  if (!habits) return [];

  // Get completions for today, this week, and this month
  const habitIds = habits.map(h => h.id);

  const { data: completions, error: completionsError } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_at')
    .in('habit_id', habitIds)
    .gte('completed_at', startOfMonth.toISOString());

  if (completionsError) throw completionsError;

  // Get all completions for streak calculation (last 400 days)
  const streakStartDate = new Date();
  streakStartDate.setDate(streakStartDate.getDate() - 400);

  const { data: allCompletions, error: allCompletionsError } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_at')
    .in('habit_id', habitIds)
    .gte('completed_at', streakStartDate.toISOString());

  if (allCompletionsError) throw allCompletionsError;

  // Calculate stats for each habit
  return habits.map(habit => {
    const habitCompletions = completions?.filter(c => c.habit_id === habit.id) || [];
    const habitAllCompletions = allCompletions?.filter(c => c.habit_id === habit.id) || [];

    const completionsToday = habitCompletions.filter(c =>
      new Date(c.completed_at).toDateString() === today.toDateString()
    ).length;

    const completionsThisWeek = habitCompletions.filter(c =>
      new Date(c.completed_at) >= startOfWeek
    ).length;

    const completionsThisMonth = habitCompletions.length;

    // Determine availability based on frequency
    const isAvailable = calculateAvailability(
      habit.frequency_type,
      habit.frequency_value,
      completionsToday,
      completionsThisWeek,
      completionsThisMonth
    );

    // Build scheduled days set for streak calculation
    let scheduledDaysSet: Set<DayOfWeek>;
    if (habit.frequency_type === 'monthly_on_weeks') {
      // For monthly habits, we need to calculate scheduled days dynamically
      // For simplicity, just use the day of week for now
      scheduledDaysSet = habit.monthly_day_of_week !== null
        ? new Set([habit.monthly_day_of_week as DayOfWeek])
        : new Set();
    } else {
      const scheduledDays = habit.scheduled_days ??
        (habit.frequency_type === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);
      scheduledDaysSet = new Set(scheduledDays as DayOfWeek[]);
    }

    // Calculate current streak
    const currentStreak = calculateStreak(habitAllCompletions, scheduledDaysSet);

    return {
      ...habit,
      completions_today: completionsToday,
      completions_this_week: completionsThisWeek,
      completions_this_month: completionsThisMonth,
      is_completed_today: completionsToday > 0,
      is_available: isAvailable,
      current_streak: currentStreak,
      longest_streak: 0, // TODO: Calculate longest streak if needed
    };
  });
}

// Calculate if habit is available based on frequency rules
function calculateAvailability(
  frequencyType: FrequencyType,
  frequencyValue: number,
  completionsToday: number,
  completionsThisWeek: number,
  completionsThisMonth: number
): boolean {
  switch (frequencyType) {
    case 'daily':
      // Daily habits can be done once per day
      return completionsToday < 1;
    case 'weekly':
      // Weekly habits can be done once per week
      return completionsThisWeek < 1;
    case 'times_per_week':
      // X times per week - available if under limit
      return completionsThisWeek < frequencyValue;
    case 'times_per_month':
      // X times per month - available if under limit
      return completionsThisMonth < frequencyValue;
    case 'monthly_on_weeks':
      // Monthly on specific weeks - checked by scheduled_days logic
      // Availability is determined by whether today is a scheduled day
      return completionsToday < 1;
    default:
      return true;
  }
}

// Get start of current week (Monday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Create a new habit
export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a habit
export async function updateHabit(
  habitId: string,
  updates: Partial<CreateHabitInput>
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete (archive) a habit
export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId);

  if (error) throw error;
}

// Toggle habit completion for today
export async function toggleHabitCompletion(
  habitId: string,
  isCurrentlyCompleted: boolean
): Promise<boolean> {
  if (isCurrentlyCompleted) {
    // Remove today's completion
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .gte('completed_at', today.toISOString())
      .lt('completed_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    return false;
  } else {
    // Add completion
    const { error } = await supabase
      .from('habit_completions')
      .insert({ habit_id: habitId });

    if (error) throw error;
    return true;
  }
}

// Toggle habit completion for a specific date
export async function toggleHabitCompletionForDate(
  habitId: string,
  userId: string,
  date: Date,
  isCurrentlyCompleted: boolean
): Promise<{ newCompletionState: boolean }> {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  // First, get habit to check if punchcard is enabled
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('punchcard_enabled')
    .eq('id', habitId)
    .single();

  if (habitError) {
    console.error('[toggleHabitCompletionForDate] Error fetching habit:', habitError);
    throw habitError;
  }

  console.log('[toggleHabitCompletionForDate] Habit data:', { habitId, punchcard_enabled: habit?.punchcard_enabled });

  if (isCurrentlyCompleted) {
    // Remove completion for that date
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .gte('completed_at', dateStart.toISOString())
      .lt('completed_at', dateEnd.toISOString());

    if (error) throw error;

    // Decrement punchcard if enabled
    if (habit?.punchcard_enabled) {
      await adjustPunchcardForCompletion(habitId, -1);
    }

    return {
      newCompletionState: false,
    };
  } else {
    // Add completion with specific timestamp
    const { error } = await supabase
      .from('habit_completions')
      .insert({
        habit_id: habitId,
        completed_at: dateStart.toISOString()
      });

    if (error) throw error;

    // Increment punchcard if enabled
    if (habit?.punchcard_enabled) {
      await adjustPunchcardForCompletion(habitId, 1);
    }

    return {
      newCompletionState: true,
    };
  }
}

// Adjust punchcard count when habit is completed/uncompleted
async function adjustPunchcardForCompletion(
  habitId: string,
  increment: number
): Promise<void> {
  console.log('[adjustPunchcardForCompletion] Called with:', { habitId, increment });

  // Call the database function to increment/decrement punchcard
  const { data, error } = await supabase.rpc('increment_punchcard', {
    habit_id_param: habitId,
    increment_by: increment
  });

  if (error) {
    console.error('[adjustPunchcardForCompletion] Error adjusting punchcard:', error);
    // Don't throw - punchcard adjustment is non-critical
    // The main completion should still succeed
  } else {
    console.log('[adjustPunchcardForCompletion] Success! New punchcard value:', data);
  }
}

// Get habits with weekly completion data for week grid
export async function getHabitsForWeekView(
  userId: string,
  weekStart: Date
): Promise<HabitWeeklyData[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Get habits with category info
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select(`
      *,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (habitsError) throw habitsError;
  if (!habits) return [];

  const habitIds = habits.map(h => h.id);
  if (habitIds.length === 0) return [];

  // Get completions for the week (for grid display)
  const { data: weekCompletions, error: weekError } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_at')
    .in('habit_id', habitIds)
    .gte('completed_at', weekStart.toISOString())
    .lt('completed_at', weekEnd.toISOString());

  if (weekError) throw weekError;

  // Get all completions for streak calculation (last 400 days should be plenty)
  const streakStartDate = new Date();
  streakStartDate.setDate(streakStartDate.getDate() - 400);

  const { data: allCompletions, error: allError } = await supabase
    .from('habit_completions')
    .select('habit_id, completed_at')
    .in('habit_id', habitIds)
    .gte('completed_at', streakStartDate.toISOString());

  if (allError) throw allError;

  // Build weekly data for each habit
  return habits.map(habit => {
    const habitWeekCompletions = weekCompletions?.filter(c => c.habit_id === habit.id) || [];
    const habitAllCompletions = allCompletions?.filter(c => c.habit_id === habit.id) || [];

    // Build completion map by date (for week grid)
    const weekCompletionsMap: Record<string, boolean> = {};
    habitWeekCompletions.forEach(c => {
      const dateKey = formatDateKey(new Date(c.completed_at));
      weekCompletionsMap[dateKey] = true;
    });

    // Build scheduled days set based on frequency type
    let scheduledDaysSet: Set<DayOfWeek>;

    if (habit.frequency_type === 'monthly_on_weeks') {
      // For monthly habits, calculate which days in THIS WEEK are scheduled
      scheduledDaysSet = new Set();

      if (habit.monthly_day_of_week !== null && habit.monthly_week_occurrences && habit.monthly_week_occurrences.length > 0) {
        // Check each day of the week to see if it matches the pattern
        const weekDatesArray = getWeekDates(weekStart);
        weekDatesArray.forEach(date => {
          const dayOfWeek = getDayOfWeek(date);

          // Does this day match the configured day of week?
          if (dayOfWeek === habit.monthly_day_of_week) {
            // Is this the Nth occurrence of this day in the month?
            for (const weekOccurrence of habit.monthly_week_occurrences) {
              if (isNthDayOfMonth(date, habit.monthly_day_of_week, weekOccurrence)) {
                scheduledDaysSet.add(dayOfWeek as DayOfWeek);
                break;
              }
            }
          }
        });
      }
    } else {
      // For other habit types, use scheduled_days
      const scheduledDays = habit.scheduled_days ??
        (habit.frequency_type === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]);
      scheduledDaysSet = new Set(scheduledDays as DayOfWeek[]);
    }

    // Calculate streak
    const streak = calculateStreak(habitAllCompletions, scheduledDaysSet);

    return {
      ...habit,
      weekCompletions: weekCompletionsMap,
      scheduledDaysSet,
      streak,
    };
  });
}

// Calculate weekly punchcard stats
export function calculateWeeklyPunchcardStats(
  habits: HabitWeeklyData[],
  weekDates: Date[]
): WeeklyPunchcardStats {
  let totalScheduled = 0;
  let totalCompleted = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  habits.forEach(habit => {
    weekDates.forEach(date => {
      const dayOfWeek = getDayOfWeek(date);
      const isScheduled = habit.scheduledDaysSet.has(dayOfWeek);

      if (isScheduled) {
        totalScheduled++;
        const dateKey = formatDateKey(date);
        if (habit.weekCompletions[dateKey]) {
          totalCompleted++;
        }
      }
    });
  });

  return {
    totalScheduledThisWeek: totalScheduled,
    completedThisWeek: totalCompleted,
  };
}

// Get today's habits (scheduled for today)
export function getTodaysHabits(habits: HabitWeeklyData[]): HabitWeeklyData[] {
  const today = new Date();
  const dayOfWeek = getDayOfWeek(today);

  return habits.filter(habit => habit.scheduledDaysSet.has(dayOfWeek));
}

// Check if habit is completed for a specific date
export function isHabitCompletedForDate(habit: HabitWeeklyData, date: Date): boolean {
  const dateKey = formatDateKey(date);
  return habit.weekCompletions[dateKey] === true;
}

// Generate punch holes for the punchcard with category icons
export interface PunchHole {
  completed: boolean;
  categoryIcon?: string;
  categoryColor?: string;
}

export function generatePunchHoles(
  habits: HabitWeeklyData[],
  weekDates: Date[]
): PunchHole[] {
  const holes: Array<PunchHole & { completedDate?: Date }> = [];

  habits.forEach(habit => {
    weekDates.forEach(date => {
      const dayOfWeek = getDayOfWeek(date);
      const isScheduled = habit.scheduledDaysSet.has(dayOfWeek);

      if (isScheduled) {
        const dateKey = formatDateKey(date);
        const isCompleted = habit.weekCompletions[dateKey] === true;

        holes.push({
          completed: isCompleted,
          categoryIcon: habit.category?.icon,
          categoryColor: habit.category?.color,
          completedDate: isCompleted ? date : undefined,
        });
      }
    });
  });

  // Sort: completed holes first (chronologically), then incomplete holes
  return holes.sort((a, b) => {
    // Both incomplete - maintain order
    if (!a.completed && !b.completed) return 0;
    // One completed, one not - completed first
    if (!a.completed) return 1;
    if (!b.completed) return -1;
    // Both completed - sort by date (earliest first = persistent slots)
    return (a.completedDate?.getTime() || 0) - (b.completedDate?.getTime() || 0);
  }).map(({ completedDate, ...hole }) => hole); // Remove date from final output
}

// Generate sequential punch holes based on total completions (not weekly habits)
export function generateSequentialPunchHoles(
  totalCompletions: number,
  maxHoles: number = 50
): PunchHole[] {
  const holes: PunchHole[] = [];

  for (let i = 0; i < maxHoles; i++) {
    holes.push({
      completed: i < totalCompletions,
      categoryIcon: undefined,
      categoryColor: undefined,
    });
  }

  return holes;
}

// Generate weekly punch holes based on THIS WEEK's completions only
export function generateWeeklyPunchHoles(
  habits: HabitWeeklyData[],
  weekDates: Date[],
  completedThisWeek: number
): PunchHole[] {
  const allScheduledHoles: PunchHole[] = [];

  // Step 1: Generate holes for all scheduled tasks this week
  habits.forEach(habit => {
    weekDates.forEach(date => {
      const dayOfWeek = getDayOfWeek(date);
      const isScheduled = habit.scheduledDaysSet.has(dayOfWeek);

      if (isScheduled) {
        allScheduledHoles.push({
          completed: false, // Will be set below
          categoryIcon: habit.category?.icon,
          categoryColor: habit.category?.color,
        });
      }
    });
  });

  // Step 2: Mark first N holes as completed (sequential filling)
  return allScheduledHoles.map((hole, index) => ({
    ...hole,
    completed: index < completedThisWeek
  }));
}

// =====================================================
// PUNCHCARD FUNCTIONS
// =====================================================

// Get habits with punchcard enabled for punchcards page
export async function getHabitsWithPunchcards(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select(`
      *,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('punchcard_enabled', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Update punchcard progress for a habit (calculate new completions since last check)
export async function updatePunchcardProgress(
  habitId: string,
  userId: string
): Promise<{ newCompletions: number; currentTotal: number }> {
  // Get the habit to check last_checked timestamp
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('punchcard_last_checked, punchcard_current, punchcard_target')
    .eq('id', habitId)
    .eq('user_id', userId)
    .single();

  if (habitError) throw habitError;
  if (!habit) throw new Error('Habit not found');

  // Count completions since last checked
  const { count, error: countError } = await supabase
    .from('habit_completions')
    .select('*', { count: 'exact', head: true })
    .eq('habit_id', habitId)
    .gt('completed_at', habit.punchcard_last_checked);

  if (countError) throw countError;

  const newCompletions = count || 0;
  // Calculate new total (but don't update persistence yet - we just want to know for animation)
  // CRITICAL FIX: Do NOT add newCompletions to punchcard_current here.
  // The increment_punchcard RPC already handles the incrementing real-time when the habit is completed.
  // This function is only for "catch-up" animation purposes to show the user what they missed.
  const animatedTotal = Math.min(
    habit.punchcard_current + newCompletions,
    habit.punchcard_target
  );

  // Update the punchcard
  const { error: updateError } = await supabase
    .from('habits')
    .update({
      // punchcard_current: newTotal, // REMOVED: Don't double count!
      punchcard_last_checked: new Date().toISOString()
    })
    .eq('id', habitId);

  if (updateError) throw updateError;

  return {
    newCompletions,
    currentTotal: animatedTotal
  };
}

// Claim a punchcard reward (reset to 0)
export async function claimPunchcardReward(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({
      punchcard_current: 0,
      punchcard_last_checked: new Date().toISOString()
    })
    .eq('id', habitId);

  if (error) throw error;
}

// =====================================================
// MONTHLY SCHEDULING HELPER
// =====================================================
// NOTE: isNthDayOfMonth is now imported from @/lib/dates

// Calculate streak for a habit based on consecutive scheduled days completed
export function calculateStreak(
  completions: { completed_at: string }[],
  scheduledDays: Set<DayOfWeek>
): number {
  if (completions.length === 0 || scheduledDays.size === 0) return 0;

  // Create a set of completed dates for quick lookup
  const completedDates = new Set(
    completions.map(c => formatDateKey(new Date(c.completed_at)))
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from today and go backwards
  const checkDate = new Date(today);

  const todayDow = getDayOfWeek(checkDate);
  const todayKey = formatDateKey(checkDate);

  if (scheduledDays.has(todayDow)) {
    // Today is scheduled
    if (completedDates.has(todayKey)) {
      // Today is completed - count it
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Today is scheduled but NOT completed yet
      // Don't count it, but start checking from yesterday
      // This allows showing the streak as pressure to maintain it!
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Today is not scheduled, start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Check up to 365 days back
  for (let i = 0; i < 365; i++) {
    const dow = getDayOfWeek(checkDate);

    if (scheduledDays.has(dow)) {
      const dateKey = formatDateKey(checkDate);
      if (completedDates.has(dateKey)) {
        streak++;
      } else {
        // Missed a scheduled day in the past - streak ends
        break;
      }
    }
    // Skip non-scheduled days (they don't break the streak)

    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
