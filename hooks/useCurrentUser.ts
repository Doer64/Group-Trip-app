'use client';

// Thin wrapper around AuthContext — keeps all existing imports working
export { useAuth as useCurrentUser } from '@/contexts/AuthContext';
