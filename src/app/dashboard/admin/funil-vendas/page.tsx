'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { setPipelineStagesConfig } from '@/lib/pipelineStagesFirestore';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';
import {
  REPORT_FUNIL_ETAPAS,
  DEFAULT_PIPELINE_STAGES_WITH_META,
  type PipelineStageWithMeta,
  type ReportCategory,
} from '@/lib/pipelineStagesConfig';
import Link from 'next/link';
import { getDemoLeads } from '@/lib/espelho/demoData';

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] relative z-10">{children}</h2>
  </div>
);

function EtapaRow({
  stage,
  index,
  total,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  leadsCount,
}: {
  stage: PipelineStageWithMeta;
  index: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  leadsCount: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded text-text-secondary hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Subir"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 rounded text-text-secondary hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Descer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{stage.label}</p>
        <p className="text-xs text-text-secondary">{stage.reportCategory}</p>
      </div>
      <span className="text-sm text-text-secondary tabular-nums shrink-0">
        {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="px-2 py-1.5 text-xs font-bold rounded-lg bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/10 transition-colors"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/40 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

export default function FunilVendasPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const { stagesWithMeta: contextStages, loading: contextLoading } = usePipelineStages();
  const [localStages, setLocalStages] = useState<PipelineStageWithMeta[]>([]);
  const [leadsCountByStage, setLeadsCountByStage] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<ReportCategory>('Topo de Funil');
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [migrateToStage, setMigrateToStage] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<ReportCategory>('Topo de Funil');

  const imobiliariaId = userData?.imobiliariaId;

  useEffect(() => {
    setLocalStages([...contextStages]);
  }, [contextStages]);

  useEffect(() => {
    if (!imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      const demoLeads = getDemoLeads();
      const counts: Record<string, number> = {};
      demoLeads.forEach((l) => {
        const etapa = l.etapa || '';
        counts[etapa] = (counts[etapa] || 0) + 1;
      });
      setLeadsCountByStage(counts);
      return;
    }
    const q = query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId));
    getDocs(q).then((snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const etapa = (d.data().etapa as string) || '';
        counts[etapa] = (counts[etapa] || 0) + 1;
      });
      setLeadsCountByStage(counts);
    });
  }, [imobiliariaId, isEspelhoDemo, localStages]);

  const handleSave = async () => {
    if (!imobiliariaId && !isEspelhoDemo) return;
    setSaving(true);
    setMessage(null);
    if (isEspelhoDemo) {
      setMessage({ type: 'ok', text: 'Modo demonstração: alterações do funil não são salvas.' });
      setSaving(false);
      return;
    }
    try {
      await setPipelineStagesConfig(imobiliariaId!, localStages);
      setMessage({ type: 'ok', text: 'Funil salvo. As alterações já valem no CRM e relatórios.' });
    } catch (e: unknown) {
      setMessage({ type: 'err', text: (e as Error).message || 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const next = [...localStages];
    const j = direction === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setLocalStages(next);
  };

  const startEdit = (index: number) => {
    const s = localStages[index];
    setEditIndex(index);
    setEditLabel(s.label);
    setEditCategory(s.reportCategory);
  };

  const applyEdit = () => {
    if (editIndex === null) return;
    const newLabelTrim = editLabel.trim();
    if (!newLabelTrim) return;
    const oldLabel = localStages[editIndex].label;
    const next = [...localStages];
    next[editIndex] = { ...localStages[editIndex], label: newLabelTrim, reportCategory: editCategory };
    setLocalStages(next);
    setEditIndex(null);
    if (oldLabel !== newLabelTrim && imobiliariaId && !isEspelhoDemo) {
      updateLeadsEtapa(imobiliariaId, oldLabel, newLabelTrim);
    }
  };

  const updateLeadsEtapa = async (imobId: string, fromEtapa: string, toEtapa: string) => {
    const q = query(
      collection(db, 'leads'),
      where('imobiliariaId', '==', imobId),
      where('etapa', '==', fromEtapa)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { etapa: toEtapa });
    });
    await batch.commit();
    setLeadsCountByStage((prev) => ({
      ...prev,
      [fromEtapa]: (prev[fromEtapa] || 0) - snap.size,
      [toEtapa]: (prev[toEtapa] || 0) + snap.size,
    }));
  };

  const startRemove = (index: number) => {
    setRemoveIndex(index);
    const label = localStages[index].label;
    const others = localStages.filter((_, i) => i !== index).map((s) => s.label);
    setMigrateToStage(others[0] ?? '');
  };

  const applyRemove = async () => {
    if (removeIndex === null || (!imobiliariaId && !isEspelhoDemo)) return;
    const stage = localStages[removeIndex];
    const count = leadsCountByStage[stage.label] || 0;
    if (!isEspelhoDemo && count > 0 && migrateToStage && imobiliariaId) {
      await updateLeadsEtapa(imobiliariaId, stage.label, migrateToStage);
    }
    const next = localStages.filter((_, i) => i !== removeIndex);
    setLocalStages(next);
    setRemoveIndex(null);
    setMigrateToStage('');
  };

  const cancelRemove = () => {
    setRemoveIndex(null);
    setMigrateToStage('');
  };

  const addStage = () => {
    const label = newLabel.trim();
    if (!label) return;
    if (localStages.some((s) => s.label === label)) {
      setMessage({ type: 'err', text: 'Já existe uma etapa com esse nome.' });
      return;
    }
    setLocalStages([...localStages, { label, reportCategory: newCategory, isQuente: false }]);
    setAdding(false);
    setNewLabel('');
    setNewCategory('Topo de Funil');
  };

  const resetToDefault = async () => {
    if (await confirmDialog({ message: 'Usar o funil padrão do sistema? Sua configuração atual será substituída.', confirmLabel: 'Usar padrão' })) {
      setLocalStages([...DEFAULT_PIPELINE_STAGES_WITH_META]);
    }
  };

  const hasChanges =
    localStages.length !== contextStages.length ||
    localStages.some((s, i) => {
      const c = contextStages[i];
      return !c || s.label !== c.label || s.reportCategory !== c.reportCategory;
    });

  if (!imobiliariaId) {
    return (
      <div className="p-4">
        <p className="text-text-secondary">Acesso restrito à imobiliária.</p>
        <Link href="/dashboard/admin" className="text-[#FF7A97] hover:text-[#FF9EB5] hover:underline mt-2 inline-block">Voltar ao admin</Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard/admin" className="text-text-secondary hover:text-white transition-colors">
          ← Admin
        </Link>
      </div>
      <SectionTitle className="mb-4">Funil de Vendas</SectionTitle>
      <p className="text-sm text-text-secondary mb-4">
        As etapas abaixo são usadas no CRM (Clientes), relatórios e Dashboards TV. Você pode adicionar, editar, remover e reordenar. Ao renomear, os leads nessa etapa são atualizados. Ao remover uma etapa que tem leads, escolha para qual etapa migrá-los.
      </p>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'ok' ? 'bg-[#34D399]/10 text-emerald-300 border border-[#34D399]/40' : 'bg-red-500/10 text-red-300 border border-red-500/40'
          }`}
        >
          {message.text}
        </div>
      )}

      {contextLoading ? (
        <LoadingState label="Carregando funil..." className="py-6" />
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {localStages.map((stage, index) => (
              <EtapaRow
                key={`${stage.label}-${index}`}
                stage={stage}
                index={index}
                total={localStages.length}
                leadsCount={leadsCountByStage[stage.label] || 0}
                onEdit={() => startEdit(index)}
                onRemove={() => startRemove(index)}
                onMoveUp={() => handleMove(index, 'up')}
                onMoveDown={() => handleMove(index, 'down')}
              />
            ))}
          </div>

          {editIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#12101a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Editar etapa</h3>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Nome da etapa</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-3"
                />
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Categoria no relatório</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ReportCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-3"
                >
                  {REPORT_FUNIL_ETAPAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setEditIndex(null)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors">Cancelar</button>
                  <button type="button" onClick={applyEdit} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all">Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {removeIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#12101a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-2">Remover etapa</h3>
                <p className="text-sm text-text-secondary mb-4">
                  A etapa &quot;{localStages[removeIndex]?.label}&quot; tem {leadsCountByStage[localStages[removeIndex]?.label || ''] || 0} lead(s). Escolha para qual etapa migrá-los antes de remover.
                </p>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Migrar leads para</label>
                <select
                  value={migrateToStage}
                  onChange={(e) => setMigrateToStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-4"
                >
                  {localStages.filter((_, i) => i !== removeIndex).map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={cancelRemove} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors">Cancelar</button>
                  <button type="button" onClick={applyRemove} className="px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-bold transition-colors">Remover e migrar</button>
                </div>
              </div>
            </div>
          )}

          {adding && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#12101a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Nova etapa</h3>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Nome da etapa</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: Proposta enviada"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-3"
                />
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Categoria no relatório</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ReportCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-3"
                >
                  {REPORT_FUNIL_ETAPAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors">Cancelar</button>
                  <button type="button" onClick={addStage} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all">Adicionar</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold transition-colors"
            >
              + Adicionar etapa
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            )}
            <button
              type="button"
              onClick={resetToDefault}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              Restaurar funil padrão
            </button>
          </div>
        </>
      )}
    </div>
  );
}
