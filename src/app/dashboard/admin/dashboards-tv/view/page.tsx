'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redireciona para a página TV sem sidebar (/tv)
export default function DashboardsTvViewPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tv');
  }, [router]);
  return (
    <div className="min-h-screen bg-[#181C23] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#FF1E56] border-t-transparent" />
    </div>
  );
}
