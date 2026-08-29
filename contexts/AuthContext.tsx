'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types/database.types';

const STORAGE_KEY = 'group_trip_user';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  identify: (email: string, name?: string) => Promise<{ success: boolean; code?: string; error?: string; user?: User }>;
  logout: () => Promise<void>;
  saveUserLocally: (userData: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage first for instant rendering, then verify with server
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage', e);
    }

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

  const identify = useCallback(
    async (email: string, name?: string): Promise<{ success: boolean; code?: string; error?: string; user?: User }> => {
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
            code: data?.error?.code,
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
    },
    []
  );

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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        identify,
        logout,
        saveUserLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
