import type { DayOfWeek } from '@/types';

// Day names (index matches JS getDay() - 0=Sunday)
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// Get Monday of the week containing the given date
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 1). If Sunday (0), go back 6 days
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get array of 7 dates for a week (Mon-Sun)
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });
}

// Format date as YYYY-MM-DD for key lookup (using local timezone)
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display (e.g., "Mon 6")
export function formatDayShort(date: Date): string {
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName} ${date.getDate()}`;
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Check if a date is in the past (before today)
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

// Check if a date is in the future (after today)
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
}

// Get day of week from date (as DayOfWeek type)
export function getDayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

// Convert day index to abbreviated name (Mon, Tue, etc.)
export function getDayName(day: DayOfWeek): string {
  return DAY_NAMES[day];
}

// Get default scheduled days based on frequency type
export function getDefaultScheduledDays(frequencyType: string): DayOfWeek[] {
  if (frequencyType === 'daily') {
    return [0, 1, 2, 3, 4, 5, 6]; // All days
  }
  return [1, 2, 3, 4, 5]; // Weekdays by default
}

// Check if a date is the Nth occurrence of a day of week in its month
// Example: Is March 15, 2024 the 3rd Monday of March?
export function isNthDayOfMonth(
  date: Date,
  dayOfWeek: number, // 0=Sunday, 6=Saturday
  weekOccurrence: number // 1=first, 2=second, 3=third, 4=fourth
): boolean {
  const dateDow = date.getDay();
  if (dateDow !== dayOfWeek) return false;

  // Calculate which occurrence this is
  const dayOfMonth = date.getDate();
  const occurrence = Math.ceil(dayOfMonth / 7);

  return occurrence === weekOccurrence;
}
