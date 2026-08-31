'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

const AUTH_STORAGE_KEY = 'vextro-authenticated';

function setAuthHint(value: boolean) {
  if (typeof window === 'undefined') return;

  if (value) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function hasStoredAuthHint() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === '1';
}

interface User {
  id: number;
  email: string;
  fullName: string;
  depositCode: string;
  balance?: number;
  needsEmail?: boolean;
  createdAt?: string;
  role?: 'USER' | 'ADMIN';
  is_2fa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch('/auth/me');
      if (data.success) {
        setUser(data.data);
        setAuthHint(true);
      } else {
        setUser(null);
        setAuthHint(false);
      }
    } catch (error) {
      setUser(null);
      setAuthHint(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setAuthHint(false);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (!hasStoredAuthHint()) {
      setLoading(false);
      return;
    }

    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
