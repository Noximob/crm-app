"use client";

// Rota antiga — a agenda dos corretores agora mora em /dashboard/admin/corretor (aba Agenda)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectAgendaUsuarios() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/admin/corretor?tab=agenda'); }, [router]);
  return null;
}
