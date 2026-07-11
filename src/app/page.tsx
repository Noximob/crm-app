'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { currentUser, isApproved, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (currentUser && isApproved) {
      router.replace('/dashboard');
    } else {
      router.replace('/entrar');
    }
  }, [currentUser, isApproved, loading, router]);

  return (
    <div className="min-h-screen bg-particles text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF1E56]" />
        <span className="al-display text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          Nox Imóveis
        </span>
      </div>
    </div>
  );
}
