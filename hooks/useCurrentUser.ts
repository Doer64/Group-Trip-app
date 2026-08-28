'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types/database.types';

const STORAGE_KEY = 'group_trip_user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage first for instant rendering
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage', e);
    }

    // Then verify with server
    fetch('/api/users/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        } else {
          // If server says unauthorized, clear localStorage
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      })
      .catch(() => {
        // Keep cached user if network fails temporarily
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const identify = useCallback(async (email: string, name?: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data?.error?.message || 'Failed to identify user',
        };
      }

      const identifiedUser = data.user;
      setUser(identifiedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identifiedUser));
      return { success: true, user: identifiedUser };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/users/me', { method: 'POST' });
    } catch {
      // Ignore
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const saveUserLocally = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  }, []);

  return {
    user,
    isLoading,
    identify,
    logout,
    saveUserLocally,
    isAuthenticated: !!user,
  };
}
