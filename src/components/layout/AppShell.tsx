'use client';

import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/lib/hooks/useAuth';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (redirect happens in useAuth)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content area with bottom padding for nav */}
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
