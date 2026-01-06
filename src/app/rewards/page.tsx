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
} from '@/lib/supabase/rewards';
import { cn } from '@/lib/utils';

export default function RewardsPage() {
  const { userId } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReward, setNewReward] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [editName, setEditName] = useState('');

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
      });
      setRewards(prev => [...prev, reward]);
      setNewReward('');
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Error adding reward:', err);
    }
  };

  // Edit reward
  const handleEditReward = async () => {
    if (!editingReward || !editName.trim()) return;

    try {
      const updated = await updateReward(editingReward.id, { name: editName.trim() });
      setRewards(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditingReward(null);
      setEditName('');
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
                    <div className="flex-1 flex items-center gap-2">
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
                          }
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={handleEditReward}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingReward(null);
                          setEditName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span>{reward.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => {
                            setEditingReward(reward);
                            setEditName(reward.name);
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
