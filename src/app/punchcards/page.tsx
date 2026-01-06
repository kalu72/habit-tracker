'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { AppShell } from '@/components/layout';
import { useAuth } from '@/lib/hooks/useAuth';
import { getHabitsWithPunchcards, updatePunchcardProgress, claimPunchcardReward } from '@/lib/supabase/habits';
import { getRewards } from '@/lib/supabase/rewards';
import type { HabitWithPunchcard, Reward } from '@/types';
import { cn } from '@/lib/utils';
import { TicketPunchcard } from '@/components/punchcard/TicketPunchcard';

export default function PunchcardsPage() {
  const { userId } = useAuth();
  const [habits, setHabits] = useState<HabitWithPunchcard[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animatingHabitId, setAnimatingHabitId] = useState<string | null>(null);
  const [claimingHabitId, setClaimingHabitId] = useState<string | null>(null);

  // Modals
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithPunchcard | null>(null);
  const [wonReward, setWonReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (userId) {
      fetchPunchcards();
    }
  }, [userId]);

  const fetchPunchcards = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const [habitsData, rewardsData] = await Promise.all([
        getHabitsWithPunchcards(userId),
        getRewards(userId)
      ]);

      // Update progress for each habit and check for new completions
      const updatedHabits = await Promise.all(
        habitsData.map(async (habit) => {
          try {
            const progress = await updatePunchcardProgress(habit.id, userId);
            return {
              ...habit,
              punchcard_current: progress.currentTotal,
              newCompletionsSinceLastCheck: progress.newCompletions
            };
          } catch (err) {
            console.error(`Error updating progress for habit ${habit.id}:`, err);
            return habit;
          }
        })
      );

      setHabits(updatedHabits);
      setRewards(rewardsData.filter(r => r.is_active));
    } catch (err) {
      console.error('Error fetching punchcards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = (habit: HabitWithPunchcard) => {
    setSelectedHabit(habit);
    if (habit.reward_type === 'direct') {
      setShowDirectModal(true);
    } else {
      setShowJackpotModal(true);
    }
  };

  const handleClaimConfirm = async () => {
    if (!selectedHabit) return;

    try {
      setClaimingHabitId(selectedHabit.id);
      await claimPunchcardReward(selectedHabit.id);

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Close modals
      setShowDirectModal(false);
      setShowJackpotModal(false);
      setSelectedHabit(null);
      setWonReward(null);

      // Refresh data
      await fetchPunchcards();
    } catch (err) {
      console.error('Error claiming punchcard:', err);
    } finally {
      setClaimingHabitId(null);
    }
  };

  const handleJackpotSpin = () => {
    if (rewards.length === 0) return;

    // Random selection
    const randomIndex = Math.floor(Math.random() * rewards.length);
    setWonReward(rewards[randomIndex]);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">My Punchcards</h1>

        {habits.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">No punchcards yet</h3>
            <p className="text-muted-foreground text-sm">
              Enable punchcard tracking on your habits to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {habits.map((habit, index) => (
              <TicketPunchcard
                key={habit.id}
                habit={habit}
                colorIndex={index}
                onClaim={() => handleClaim(habit)}
                isClaiming={claimingHabitId === habit.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Direct Reward Modal */}
      {showDirectModal && selectedHabit && (
        <DirectRewardModal
          habit={selectedHabit}
          onConfirm={handleClaimConfirm}
          onClose={() => setShowDirectModal(false)}
        />
      )}

      {/* Jackpot Modal */}
      {showJackpotModal && selectedHabit && (
        <JackpotModal
          habit={selectedHabit}
          rewards={rewards}
          wonReward={wonReward}
          onSpin={handleJackpotSpin}
          onConfirm={handleClaimConfirm}
          onClose={() => setShowJackpotModal(false)}
        />
      )}
    </AppShell>
  );
}

// Direct Reward Modal
function DirectRewardModal({
  habit,
  onConfirm,
  onClose
}: {
  habit: HabitWithPunchcard;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>
        <p className="text-white/90 mb-4">You've completed your punchcard!</p>
        <div className="bg-white/20 rounded-xl p-4 mb-6">
          <p className="text-xl font-bold text-white">{habit.reward_text || 'Your Reward'}</p>
        </div>
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-white text-emerald-600 rounded-xl font-bold text-lg hover:bg-white/90"
        >
          Claim Reward
        </button>
      </div>
    </div>
  );
}

// Jackpot Modal
function JackpotModal({
  habit,
  rewards,
  wonReward,
  onSpin,
  onConfirm,
  onClose
}: {
  habit: HabitWithPunchcard;
  rewards: Reward[];
  wonReward: Reward | null;
  onSpin: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpin = () => {
    setIsSpinning(true);
    onSpin();
    setTimeout(() => {
      setIsSpinning(false);
    }, 3000);
  };

  if (rewards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-3xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">No Rewards Available</h2>
          <p className="text-muted-foreground mb-6">Add rewards to your bag to use the jackpot!</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      {!wonReward ? (
        <div className="text-center">
          <div className={cn("text-8xl mb-6", isSpinning && "animate-bounce")}>🎰</div>
          <h2 className="text-3xl font-bold text-white mb-4">Jackpot Time!</h2>
          <p className="text-white/80 mb-6">Tap to spin for a random reward!</p>
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="px-8 py-4 bg-yellow-400 text-yellow-900 rounded-2xl font-bold text-xl hover:bg-yellow-300 disabled:opacity-50"
          >
            {isSpinning ? 'SPINNING...' : 'SPIN!'}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">You Won!</h2>
          <div className="bg-white/20 rounded-xl p-6 mb-6">
            <p className="text-2xl font-bold text-white">{wonReward.name}</p>
            {wonReward.description && (
              <p className="text-white/80 text-sm mt-1">{wonReward.description}</p>
            )}
          </div>
          <button
            onClick={onConfirm}
            className="px-8 py-3 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-white/90"
          >
            Claim & Continue
          </button>
        </div>
      )}
    </div>
  );
}
