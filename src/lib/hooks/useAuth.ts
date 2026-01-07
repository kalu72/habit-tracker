'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setCurrentUserId } from '@/lib/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userName: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Try to get initial state synchronously from localStorage to prevent flash
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('habit_tracker_user_id');
      const userName = localStorage.getItem('habit_tracker_name');
      if (userId) {
        return { isAuthenticated: true, isLoading: false, userId, userName };
      }
    }
    return { isAuthenticated: false, isLoading: true, userId: null, userName: null };
  });

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      const storedId = localStorage.getItem('habit_tracker_user_id');
      const storedName = localStorage.getItem('habit_tracker_name');

      console.log(`[v1.2] initAuth check. Path: ${pathname}, ID in storage: ${storedId}`);

      if (storedId) {
        try {
          // Restore/Verify session
          await setCurrentUserId(storedId);

          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            userId: storedId,
            userName: storedName,
          });
          console.log('[v1.2] Auth success');
        } catch (error) {
          console.error('[v1.2] Session restoration failed:', error);
          // Only clear if it's a definitive "user doesn't exist" or similar
          // For now, let's be conservative and not wipe storage on random errors
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        console.log('[v1.2] No user ID found in storage');
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          userName: null,
        });

        // Redirect to login if not on login page
        if (pathname !== '/login') {
          console.log(`[v1.2] Redirecting from ${pathname} to /login`);
          router.push('/login');
        }
      }
    }

    // Only run init if we're still "loading" or if we're on a page that needs auth
    if (authState.isLoading || (pathname !== '/login' && !authState.isAuthenticated)) {
      initAuth();
    }
  }, [router, pathname, authState.isLoading, authState.isAuthenticated]);

  const logout = useCallback(async () => {
    console.log('[v1.2] Logging out...');
    await setCurrentUserId(null);
    localStorage.removeItem('habit_tracker_user_id');
    localStorage.removeItem('habit_tracker_name');
    localStorage.removeItem('habit_tracker_pin');

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      userId: null,
      userName: null,
    });
    router.push('/login');
  }, [router]);

  return {
    ...authState,
    logout,
  };
}
