'use client';

import { cn } from '@/lib/utils';
import type { DayOfWeek } from '@/types';

interface DayPickerProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
}

// Days displayed Monday-first
const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

export function DayPicker({ selectedDays, onChange, disabled }: DayPickerProps) {
  const toggleDay = (day: DayOfWeek) => {
    if (disabled) return;

    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekdays = () => {
    if (disabled) return;
    onChange([1, 2, 3, 4, 5]);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {DAYS.map(({ value, label }) => {
          const isSelected = selectedDays.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              disabled={disabled}
              className={cn(
                'flex-1 h-10 rounded-lg font-medium text-sm transition-all',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectWeekdays}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Weekdays
        </button>
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Every day
        </button>
      </div>
    </div>
  );
}
