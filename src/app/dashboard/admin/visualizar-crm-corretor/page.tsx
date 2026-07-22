"use client";

// Rota antiga — o CRM do corretor agora mora em /dashboard/admin/corretor (aba CRM)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectVisualizarCrm() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/admin/corretor?tab=crm'); }, [router]);
  return null;
}
