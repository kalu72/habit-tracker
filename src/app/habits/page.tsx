'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout';
import { DayPicker } from '@/components/habits/DayPicker';
import { useAuth } from '@/lib/hooks/useAuth';
import { getHabitsWithStats, createHabit, updateHabit, deleteHabit } from '@/lib/supabase/habits';
import { getCategories, createDefaultCategories, createCategory, updateCategory } from '@/lib/supabase/categories';
import { getRewards } from '@/lib/supabase/rewards';
import { getDefaultScheduledDays, DAY_NAMES } from '@/lib/dates';
import type { HabitWithStatus, Category, Reward, FrequencyType, DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = ['✨', '💪', '📚', '❤️', '⚡', '🎯', '🧘', '💼', '🎨', '🌱', '💰', '🏃', '🍎', '💤', '🧠', '🐕', '🏠'];
const COLOR_OPTIONS = [
  '#7c3aed', '#ec4899', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444',
];

export default function HabitsPage() {
  const { userId, isLoading: authLoading } = useAuth();
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyValue, setFrequencyValue] = useState(1);
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);

  // Punchcard form state
  const [punchcardEnabled, setPunchcardEnabled] = useState(false);
  const [punchcardTarget, setPunchcardTarget] = useState(10);
  const [rewardType, setRewardType] = useState<'direct' | 'jackpot' | null>(null);
  const [rewardText, setRewardText] = useState('');

  // Hide when quota reached (for times_per_week/month)
  const [hideWhenQuotaReached, setHideWhenQuotaReached] = useState(false);

  // Monthly scheduling form state
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState<number>(1); // Default: Monday
  const [monthlyWeekOccurrences, setMonthlyWeekOccurrences] = useState<number[]>([1]); // Default: 1st week

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('✨');
  const [newCategoryColor, setNewCategoryColor] = useState('#7c3aed');

  // Update scheduled days when frequency type changes
  useEffect(() => {
    setScheduledDays(getDefaultScheduledDays(frequencyType));
  }, [frequencyType]);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      try {
        setIsLoading(true);
        let cats = await getCategories(userId);

        if (cats.length === 0) {
          cats = await createDefaultCategories(userId);
        }

        const [habitsData, rewardsData] = await Promise.all([
          getHabitsWithStats(userId),
          getRewards(userId)
        ]);

        // Normalize rewards: convert null description → undefined
        const normalizedRewards = rewardsData.map(r => ({
          ...r,
          description: r.description ?? undefined,
        }));

        setCategories(cats);
        setHabits(habitsData);
        setRewards(normalizedRewards); // use normalized rewards here
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const getFrequencyText = (type: FrequencyType, value: number) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'times_per_week': return `${value}x/week`;
      case 'times_per_month': return `${value}x/month`;
      case 'monthly_on_weeks': return 'Monthly on specific weeks';
      default: return type;
    }
  };

  const getScheduledDaysText = (days: DayOfWeek[] | null) => {
    if (!days || days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    return days.map(d => DAY_NAMES[d]).join(', ');
  };

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setFrequencyType('daily');
    setFrequencyValue(1);
    setScheduledDays([0, 1, 2, 3, 4, 5, 6]);
    setPunchcardEnabled(false);
    setPunchcardTarget(10);
    setRewardType(null);
    setRewardText('');
    setHideWhenQuotaReached(false);
    setMonthlyDayOfWeek(1);
    setMonthlyWeekOccurrences([1]);
    setShowForm(false);
    setEditingHabitId(null);
  };

  const startEditing = (habit: HabitWithStatus) => {
    setEditingHabitId(habit.id);
    setName(habit.name);
    setCategoryId(habit.category?.id || '');
    setFrequencyType(habit.frequency_type);
    setFrequencyValue(habit.frequency_value);
    setScheduledDays(habit.scheduled_days || [0, 1, 2, 3, 4, 5, 6]);
    setPunchcardEnabled(habit.punchcard_enabled);
    setPunchcardTarget(habit.punchcard_target);
    setRewardType(habit.reward_type);
    setRewardText(habit.reward_text || '');
    setHideWhenQuotaReached(habit.hide_when_quota_reached);
    setMonthlyDayOfWeek(habit.monthly_day_of_week || 1);
    setMonthlyWeekOccurrences(habit.monthly_week_occurrences || [1]);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !name.trim()) return;

    try {
      setIsSubmitting(true);

      const habitData = {
        name: name.trim(),
        category_id: categoryId || undefined,
        frequency_type: frequencyType,
        frequency_value: frequencyValue,
        scheduled_days: scheduledDays,
        punchcard_enabled: punchcardEnabled,
        punchcard_target: punchcardTarget,
        reward_type: punchcardEnabled ? rewardType : null,
        reward_text: punchcardEnabled && rewardType === 'direct' ? rewardText.trim() : null,
        hide_when_quota_reached: hideWhenQuotaReached,
        monthly_day_of_week: frequencyType === 'monthly_on_weeks' ? monthlyDayOfWeek : null,
        monthly_week_occurrences: frequencyType === 'monthly_on_weeks' ? monthlyWeekOccurrences : null,
      };

      if (editingHabitId) {
        // Update existing habit
        await updateHabit(editingHabitId, habitData);
      } else {
        // Create new habit
        await createHabit({
          user_id: userId,
          ...habitData,
        });
      }

      resetForm();

      // Refresh habits
      const habitsData = await getHabitsWithStats(userId);
      setHabits(habitsData);
    } catch (err) {
      console.error('Error saving habit:', err);

      let errorMessage = 'Unknown error';
      let errorDetail = '';

      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for Supabase/PostgREST specific errors
        if ('code' in err) {
          errorDetail = ` (Code: ${(err as any).code})`;
        }
        if ('details' in err && (err as any).details) {
          errorDetail += ` - ${(err as any).details}`;
        }
        if ('hint' in err && (err as any).hint) {
          errorDetail += ` (Hint: ${(err as any).hint})`;
        }
        console.error('Full error object:', JSON.stringify(err, null, 2));
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }

      // Show enhanced error to user
      alert(`Failed to save habit: ${errorMessage}${errorDetail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryIcon('✨');
    setNewCategoryColor('#7c3aed');
    setShowCategoryForm(false);
    setEditingCategoryId(null);
  };

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setNewCategoryColor(category.color);
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newCategoryName.trim()) return;

    try {
      setIsSubmitting(true);

      if (editingCategoryId) {
        // Update existing category
        await updateCategory(editingCategoryId, {
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          color: newCategoryColor,
        });
      } else {
        // Create new category
        await createCategory({
          user_id: userId,
          name: newCategoryName.trim(),
          icon: newCategoryIcon,
          color: newCategoryColor,
        });
      }

      resetCategoryForm();

      // Refresh categories
      const cats = await getCategories(userId);
      setCategories(cats);
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (habitId: string) => {
    if (!userId) return;
    if (!confirm('Delete this habit?')) return;

    try {
      await deleteHabit(habitId);
      const habitsData = await getHabitsWithStats(userId);
      setHabits(habitsData);
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-lg w-32"></div>
            <div className="h-14 bg-muted rounded-xl"></div>
            <div className="h-14 bg-muted rounded-xl"></div>
            <div className="h-14 bg-muted rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Habits</h1>
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              showForm
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {showForm ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
                Add Habit
              </>
            )}
          </button>
        </div>

        {/* Add/Edit Habit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-lg">
              {editingHabitId ? 'Edit Habit' : 'New Habit'}
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Habit Name</label>
              <input
                type="text"
                placeholder="e.g., Morning Skincare"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Frequency</label>
              <select
                value={frequencyType}
                onChange={(e) => setFrequencyType(e.target.value as FrequencyType)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="times_per_week">Times per week</option>
                <option value="times_per_month">Times per month</option>
                <option value="monthly_on_weeks">Monthly on specific weeks</option>
              </select>
            </div>

            {/* Number of times (for times_per_week and times_per_month) */}
            {(frequencyType === 'times_per_week' || frequencyType === 'times_per_month') && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  How many times per {frequencyType === 'times_per_week' ? 'week' : 'month'}?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFrequencyValue(Math.max(1, frequencyValue - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={frequencyValue <= 1}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={frequencyValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= 30) {
                        setFrequencyValue(val);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setFrequencyValue(Math.min(30, frequencyValue + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={frequencyValue >= 30}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This habit can be completed up to {frequencyValue} time{frequencyValue !== 1 ? 's' : ''} per {frequencyType === 'times_per_week' ? 'week' : 'month'}
                </p>
              </div>
            )}

            {frequencyType === 'monthly_on_weeks' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Day of Week</label>
                  <select
                    value={monthlyDayOfWeek}
                    onChange={(e) => setMonthlyDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Which weeks?</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map((week) => (
                      <button
                        key={week}
                        type="button"
                        onClick={() => {
                          if (monthlyWeekOccurrences.includes(week)) {
                            setMonthlyWeekOccurrences(monthlyWeekOccurrences.filter(w => w !== week));
                          } else {
                            setMonthlyWeekOccurrences([...monthlyWeekOccurrences, week].sort());
                          }
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-colors",
                          monthlyWeekOccurrences.includes(week)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {week === 1 ? '1st' : week === 2 ? '2nd' : week === 3 ? '3rd' : '4th'}
                      </button>
                    ))}
                  </div>
                  {monthlyWeekOccurrences.length === 0 && (
                    <p className="text-xs text-destructive mt-1">Select at least one week</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5">Which days?</label>
                <DayPicker
                  selectedDays={scheduledDays}
                  onChange={setScheduledDays}
                />
                {scheduledDays.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Select at least one day</p>
                )}
              </div>
            )}

            {/* Hide when quota reached (only for quota-based habits) */}
            {(frequencyType === 'times_per_week' || frequencyType === 'times_per_month') && (
              <div className="border-t border-border pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideWhenQuotaReached}
                    onChange={(e) => setHideWhenQuotaReached(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-medium">Hide when quota reached</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  This habit will be hidden from the Today page when you reach your {frequencyType === 'times_per_week' ? 'weekly' : 'monthly'} quota
                </p>
              </div>
            )}

            {/* Punchcard Settings */}
            <div className="border-t border-border pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={punchcardEnabled}
                  onChange={(e) => setPunchcardEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="font-medium">Enable Punchcard Tracking</span>
              </label>

              {punchcardEnabled && (
                <div className="space-y-3 ml-6">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Target completions</label>
                    <input
                      type="number"
                      min="1"
                      value={punchcardTarget}
                      onChange={(e) => setPunchcardTarget(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Reward Type</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rewardType"
                          checked={rewardType === 'direct'}
                          onChange={() => setRewardType('direct')}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span>Direct Reward</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rewardType"
                          checked={rewardType === 'jackpot'}
                          onChange={() => setRewardType('jackpot')}
                          className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span>Jackpot (Random from bag)</span>
                      </label>
                    </div>
                  </div>

                  {rewardType === 'direct' && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Reward Description</label>
                      <input
                        type="text"
                        placeholder="e.g., Watch a movie, Buy a coffee"
                        value={rewardText}
                        onChange={(e) => setRewardText(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This reward will be shown when you complete this punchcard
                      </p>
                    </div>
                  )}

                  {rewardType === 'jackpot' && (
                    <p className="text-xs text-muted-foreground">
                      A random reward will be selected from your reward bag when you complete this punchcard.
                      {rewards.filter(r => r.is_active).length === 0 && (
                        <span className="text-destructive"> Add rewards to your bag first!</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !name.trim() ||
                (frequencyType === 'monthly_on_weeks' ? monthlyWeekOccurrences.length === 0 : scheduledDays.length === 0)
              }
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? (editingHabitId ? 'Saving...' : 'Creating...')
                : (editingHabitId ? 'Save Changes' : 'Create Habit')}
            </button>
          </form>
        )}

        {/* Empty state */}
        {habits.length === 0 && !showForm && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">No habits yet</h3>
            <p className="text-muted-foreground text-sm">
              Tap &quot;Add Habit&quot; to create your first habit.
            </p>
          </div>
        )}

        {/* Habits List */}
        <div className="space-y-2">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{habit.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {habit.category && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${habit.category.color}15`,
                        color: habit.category.color
                      }}
                    >
                      {habit.category.name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {getScheduledDaysText(habit.scheduled_days)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEditing(habit)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Categories</h2>
            <button
              onClick={() => {
                if (showCategoryForm) {
                  resetCategoryForm();
                } else {
                  setShowCategoryForm(true);
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              {showCategoryForm ? 'Cancel' : '+ Add Category'}
            </button>
          </div>

          {/* Category Creation/Edit Form */}
          {showCategoryForm && (
            <form onSubmit={handleCategorySubmit} className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
              <h3 className="font-semibold">
                {editingCategoryId ? 'Edit Category' : 'New Category'}
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mindfulness"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCategoryIcon(icon)}
                      className={cn(
                        'w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all',
                        newCategoryIcon === icon
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={cn(
                        'w-10 h-10 rounded-lg transition-all',
                        newCategoryColor === color
                          ? 'ring-2 ring-offset-2 ring-foreground'
                          : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Preview</label>
                <span
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: newCategoryColor }}
                >
                  {newCategoryIcon} {newCategoryName || 'Category Name'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newCategoryName.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? (editingCategoryId ? 'Saving...' : 'Creating...')
                  : (editingCategoryId ? 'Save Changes' : 'Create Category')}
              </button>
            </form>
          )}

          {/* Category List */}
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startEditingCategory(cat)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon} {cat.name}
                  <svg className="w-3 h-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet. Create one above!</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
