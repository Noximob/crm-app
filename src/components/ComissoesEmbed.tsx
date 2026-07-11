'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface CrmUser { uid: string; nome: string; email: string; tipo?: string; }

/**
 * Embute o app de Comissões (public/comissoes) e faz a ponte com o CRM:
 * manda a lista de usuários (pro admin vincular pessoas) e quem está logado
 * (pro modo view mostrar só o que é da pessoa) via postMessage. O app de
 * comissões continua com backend próprio (comissoes-nox); nada é migrado.
 */
export default function ComissoesEmbed({ mode }: { mode: 'admin' | 'view' }) {
  const { currentUser, userData } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const imobiliariaId = userData?.imobiliariaId;

  // Carrega os usuários da imobiliária (uid, nome, email) para os vínculos.
  useEffect(() => {
    if (!imobiliariaId) return;
    let ativo = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)));
        const list: CrmUser[] = snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as any) }))
          .filter((u) => u.aprovado !== false)
          .map((u) => ({ uid: u.uid, nome: u.nome || u.email || '(sem nome)', email: u.email || '', tipo: u.tipoConta }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        if (ativo) setUsers(list);
      } catch {
        /* silencioso: sem a lista, o admin ainda vê os nomes digitados */
      }
    })();
    return () => { ativo = false; };
  }, [imobiliariaId]);

  const post = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({
      __noxCRM: 1,
      users,
      me: currentUser ? { uid: currentUser.uid, nome: userData?.nome || '', email: currentUser.email || userData?.email || '' } : null,
    }, window.location.origin);
  }, [users, currentUser, userData]);

  // Reenvia sempre que os dados mudam e responde ao "pronto" do iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data && e.data.__noxCommReady) post(); };
    window.addEventListener('message', onMsg);
    post();
    return () => window.removeEventListener('message', onMsg);
  }, [post]);

  return (
    <iframe
      ref={iframeRef}
      src={`/comissoes/index.html?mode=${mode}`}
      title="Comissões"
      onLoad={post}
      className="w-full h-full rounded-xl border border-white/10 bg-[#f7f5f0]"
      style={{ minHeight: 'calc(100vh - 140px)' }}
    />
  );
}
