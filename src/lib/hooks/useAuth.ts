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
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    userName: null,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      // Check for existing session in localStorage
      const userId = localStorage.getItem('habit_tracker_user_id');
      const userName = localStorage.getItem('habit_tracker_name');

      if (userId) {
        try {
          // Restore the Supabase session variable for RLS
          await setCurrentUserId(userId);

          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            userId,
            userName,
          });
        } catch (error) {
          console.error('Failed to restore session:', error);
          // If session restoration fails, clear localStorage and redirect to login
          localStorage.removeItem('habit_tracker_user_id');
          localStorage.removeItem('habit_tracker_name');
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            userId: null,
            userName: null,
          });
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          userName: null,
        });

        // Redirect to login if not authenticated and not already on login page
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    }

    initAuth();
  }, [pathname, router]);

  const logout = useCallback(async () => {
    // Clear the session variable
    await setCurrentUserId(null);

    // Clear localStorage
    localStorage.removeItem('habit_tracker_user_id');
    localStorage.removeItem('habit_tracker_pin');
    localStorage.removeItem('habit_tracker_name');

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
