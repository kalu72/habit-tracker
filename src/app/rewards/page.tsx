'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getRewards,
  createReward,
  updateReward,
  deleteReward,
  type Reward,
  type RewardBag,
} from '@/lib/supabase/rewards';
import { cn } from '@/lib/utils';

export default function RewardsPage() {
  const { userId } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReward, setNewReward] = useState('');
  const [newRewardBag, setNewRewardBag] = useState<RewardBag>('baller');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [editName, setEditName] = useState('');
  const [editBag, setEditBag] = useState<RewardBag>('baller');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!userId) return;

      try {
        setIsLoading(true);
        const rewardsData = await getRewards(userId);
        setRewards(rewardsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  // Add reward
  const handleAddReward = async () => {
    if (!userId || !newReward.trim()) return;

    try {
      const reward = await createReward({
        user_id: userId,
        name: newReward.trim(),
        reward_bag: newRewardBag,
      });
      setRewards(prev => [...prev, reward]);
      setNewReward('');
      setNewRewardBag('baller');
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Error adding reward:', err);
    }
  };

  // Edit reward
  const handleEditReward = async () => {
    if (!editingReward || !editName.trim()) return;

    try {
      const updated = await updateReward(editingReward.id, {
        name: editName.trim(),
        reward_bag: editBag,
      });
      setRewards(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditingReward(null);
      setEditName('');
      setEditBag('baller');
    } catch (err) {
      console.error('Error updating reward:', err);
    }
  };

  // Delete reward
  const handleDeleteReward = async (rewardId: string) => {
    try {
      await deleteReward(rewardId);
      setRewards(prev => prev.filter(r => r.id !== rewardId));
    } catch (err) {
      console.error('Error deleting reward:', err);
    }
  };


  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-40" />
            <div className="h-48 bg-muted rounded-2xl" />
            <div className="h-32 bg-muted rounded-xl" />
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
          <h1 className="text-2xl font-bold">Reward Bag</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <span className="text-lg">+</span>
                Add Reward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Reward</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reward">Reward Name</Label>
                  <Input
                    id="reward"
                    placeholder="e.g., Spa Day"
                    value={newReward}
                    onChange={(e) => setNewReward(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddReward()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reward Bag</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="newRewardBag"
                        checked={newRewardBag === 'baby'}
                        onChange={() => setNewRewardBag('baby')}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">Baby (small wins)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="newRewardBag"
                        checked={newRewardBag === 'baller'}
                        onChange={() => setNewRewardBag('baller')}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">Baller (big wins)</span>
                    </label>
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddReward}>
                  Add to Bag
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Text */}
        <p className="text-muted-foreground text-sm text-center">
          Add rewards to your bag. They can be used with punchcard tracking on your habits!
        </p>

        {/* Current Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🎁</span>
              Available Rewards ({rewards.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rewards.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No rewards yet. Add some to get started!
              </p>
            ) : (
              rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  {editingReward?.id === reward.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditReward();
                            if (e.key === 'Escape') {
                              setEditingReward(null);
                              setEditName('');
                              setEditBag('baller');
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="editBag"
                            checked={editBag === 'baby'}
                            onChange={() => setEditBag('baby')}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs">Baby</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="editBag"
                            checked={editBag === 'baller'}
                            onChange={() => setEditBag('baller')}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs">Baller</span>
                        </label>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" onClick={handleEditReward}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingReward(null);
                            setEditName('');
                            setEditBag('baller');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span>{reward.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          reward.reward_bag === 'baby'
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        )}>
                          {reward.reward_bag === 'baby' ? 'Baby' : 'Baller'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => {
                            setEditingReward(reward);
                            setEditName(reward.name);
                            setEditBag(reward.reward_bag);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReward(reward.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-xl">
          <p className="font-medium mb-1">How Credits Work</p>
          <p>Complete 10 habits to earn 1 credit. Use credits to spin the jackpot for random rewards!</p>
        </div>
      </div>
    </AppShell>
  );
}
