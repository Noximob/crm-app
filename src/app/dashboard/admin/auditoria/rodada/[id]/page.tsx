'use client';

/**
 * AUDITORIA · A RODADA (carga) — busca a rodada e a anterior do mesmo
 * corretor, e entrega tudo pronto para a view apresentar.
 *
 * A rodada anterior não é detalhe: é dela que sai a coluna "anterior" do
 * quadro de indicadores. Sem ela o gestor vê o retrato do mês; com ela vê o
 * filme, que é o que permite dizer se a instrução da rodada passada pegou.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { carregarDiretrizes, type DiretrizesAuditoria } from '@/lib/auditoria';
import { showToast } from '@/components/ui/toast';
import RodadaView, { type RodadaDoc } from './view';

const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

export default function RodadaPage() {
  const { id } = useParams<{ id: string }>();
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [r, setR] = useState<RodadaDoc | null>(null);
  const [anteriorQuadro, setAnteriorQuadro] = useState<unknown>(null);
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [diretrizes, setDiretrizes] = useState<DiretrizesAuditoria | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // a régua da casa dá as referências do quadro que o sistema monta
  useEffect(() => { carregarDiretrizes(imobiliariaId).then(setDiretrizes); }, [imobiliariaId]);

  useEffect(() => {
    if (!id || !imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    let vivo = true;
    (async () => {
      setCarregando(true);
      try {
        const snap = await getDoc(doc(db, 'auditoriaRodadas', String(id)));
        if (!vivo) return;
        if (!snap.exists()) { setErro('Rodada não encontrada.'); return; }
        const d = { id: snap.id, ...snap.data() } as RodadaDoc & { imobiliariaId?: string };
        if (d.imobiliariaId && d.imobiliariaId !== imobiliariaId) { setErro('Rodada não encontrada.'); return; }
        setR(d);

        const s = await getDocs(query(collection(db, 'auditoriaRodadas'),
          where('imobiliariaId', '==', imobiliariaId), where('corretorUid', '==', d.corretorUid)));
        if (!vivo) return;
        const ant = s.docs
          .map((x) => ({ id: x.id, ...x.data() } as RodadaDoc))
          .filter((x) => x.id !== d.id && !!x.analise && String(x.geradoEmYmd || '') < String(d.geradoEmYmd || ''))
          .sort((a, b) => String(b.geradoEmYmd).localeCompare(String(a.geradoEmYmd)))[0];
        setAnteriorQuadro(ant?.analise?.quadro_indicadores ?? null);
      } catch (e) {
        console.error('carregar rodada:', e);
        if (vivo) setErro('Não foi possível carregar a rodada.');
      } finally { if (vivo) setCarregando(false); }
    })();
    return () => { vivo = false; };
  }, [id, imobiliariaId, isEspelhoDemo]);

  // só quando o gestor vai corrigir o nome — não custa carregar antes disso
  const carregarCorretores = () => {
    if (!imobiliariaId || corretores.length) return;
    getDocs(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)))
      .then((s) => setCorretores(s.docs
        .map((d) => ({ id: d.id, nome: String(d.data().nome || d.id.slice(0, 6)), tipo: String(d.data().tipoConta || '') }))
        .filter((c) => c.tipo.startsWith('corretor'))
        .sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => { /* a lista é sugestão; o campo aceita texto livre */ });
  };
  useEffect(carregarCorretores, [imobiliariaId, corretores.length]);

  const renomear = async (nome: string) => {
    if (!r) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    await updateDoc(doc(db, 'auditoriaRodadas', r.id), { corretorNome: nome });
    setR({ ...r, corretorNome: nome });
    showToast('Nome atualizado.', 'success');
  };

  if (carregando) return <div className="al-card max-w-3xl mx-auto mt-10 p-10 text-center text-text-secondary">Carregando a rodada…</div>;

  if (erro || !r) {
    return (
      <div className="al-card max-w-3xl mx-auto mt-10 p-10 text-center">
        <p className="text-[36px] mb-2">🗂️</p>
        <p className="text-sm text-text-secondary">{erro || (isEspelhoDemo ? 'As rodadas reais não aparecem no modo demonstração.' : 'Rodada não encontrada.')}</p>
        <Link href="/dashboard/admin/auditoria/historico/" className={btnGhost + ' inline-block mt-4'}>← Histórico</Link>
      </div>
    );
  }

  return <RodadaView r={r} anteriorQuadro={anteriorQuadro} corretores={corretores} diretrizes={diretrizes} onRenomear={renomear} />;
}
