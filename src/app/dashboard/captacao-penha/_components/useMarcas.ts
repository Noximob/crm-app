'use client';

/**
 * AS MARCAS DE CADA PESSOA — os anúncios que ela excluiu da lista e as
 * anotações que fez. No painel original isso ficava no navegador; aqui fica na
 * conta (captacaoPenha/{uid}), então acompanha a pessoa do computador pro
 * celular. Cada um só enxerga as suas: excluir um anúncio não tira ele da
 * lista de mais ninguém.
 *
 *   captacaoPenha/{uid} = { excluidos: { <imóvel>: true }, notas: { <imóvel>: 'texto' } }
 *
 * Cada marca é gravada sozinha (merge), sem regravar o documento inteiro — dois
 * aparelhos abertos ao mesmo tempo não apagam o que o outro fez. A tela muda
 * na hora e o banco confirma depois; se a gravação falhar, o aviso aparece e
 * o banco devolve a tela ao que estava guardado.
 *
 * No espelho (demonstração) nada é gravado: as marcas vivem só na tela.
 */
import { useCallback, useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CAPTACAO_COLECAO } from '@/lib/captacaoPenha';
import { showToast } from '@/components/ui/toast';

export interface Marcas {
  /** já chegou a resposta do banco (ou não há o que esperar) */
  pronto: boolean;
  excluidos: Record<string, true>;
  notas: Record<string, string>;
  excluir: (id: string) => void;
  devolver: (id: string) => void;
  /** texto vazio apaga a anotação */
  anotar: (id: string, texto: string) => void;
}

function soMarcados(o: unknown): Record<string, true> {
  const r: Record<string, true> = {};
  if (o && typeof o === 'object') Object.entries(o as Record<string, unknown>).forEach(([k, v]) => { if (v) r[k] = true; });
  return r;
}
function soTextos(o: unknown): Record<string, string> {
  const r: Record<string, string> = {};
  if (o && typeof o === 'object') Object.entries(o as Record<string, unknown>).forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) r[k] = v; });
  return r;
}

export function useMarcas(uid: string | undefined, demo: boolean): Marcas {
  const naConta = !!uid && !demo;
  const [pronto, setPronto] = useState(!naConta);
  const [excluidos, setExcluidos] = useState<Record<string, true>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!uid || demo) { setPronto(true); return; }
    // se o banco demorar, a lista não fica esperando: abre e as marcas entram quando chegarem
    const prazo = setTimeout(() => setPronto(true), 4000);
    const parar = onSnapshot(
      doc(db, CAPTACAO_COLECAO, uid),
      (snap) => {
        const d = snap.data() || {};
        setExcluidos(soMarcados(d.excluidos));
        setNotas(soTextos(d.notas));
        setPronto(true);
      },
      (e) => { console.error('captação: não li as marcas', e); setPronto(true); },
    );
    return () => { clearTimeout(prazo); parar(); };
  }, [uid, demo]);

  const gravar = useCallback((campo: 'excluidos' | 'notas', id: string, valor: true | string | null) => {
    if (!uid || demo) return;
    setDoc(
      doc(db, CAPTACAO_COLECAO, uid),
      { [campo]: { [id]: valor === null ? deleteField() : valor }, atualizadoEm: serverTimestamp() },
      { merge: true },
    ).catch((e) => {
      console.error('captação: não gravei a marca', e);
      showToast('Não consegui guardar na sua conta. Confira a conexão e tente de novo.', 'error');
    });
  }, [uid, demo]);

  const excluir = useCallback((id: string) => {
    setExcluidos((p) => ({ ...p, [id]: true }));
    gravar('excluidos', id, true);
  }, [gravar]);
  const devolver = useCallback((id: string) => {
    setExcluidos((p) => { const n = { ...p }; delete n[id]; return n; });
    gravar('excluidos', id, null);
  }, [gravar]);
  const anotar = useCallback((id: string, texto: string) => {
    const t = texto.trim();
    setNotas((p) => { const n = { ...p }; if (t) n[id] = t; else delete n[id]; return n; });
    gravar('notas', id, t || null);
  }, [gravar]);

  return { pronto, excluidos, notas, excluir, devolver, anotar };
}
