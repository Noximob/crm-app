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
import {
  REPORT_FUNIL_ETAPAS,
  DEFAULT_PIPELINE_STAGES_WITH_META,
  type PipelineStageWithMeta,
  type ReportCategory,
} from '@/lib/pipelineStagesConfig';
import Link from 'next/link';

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
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
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--bg-card)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Subir"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Descer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)] dark:text-white truncate">{stage.label}</p>
        <p className="text-xs text-[var(--text-secondary)]">{stage.reportCategory}</p>
      </div>
      <span className="text-sm text-[var(--text-secondary)] tabular-nums shrink-0">
        {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="px-2 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30 border border-red-500/40"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

export default function FunilVendasPage() {
  const { userData } = useAuth();
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
    if (!imobiliariaId) return;
    const q = query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId));
    getDocs(q).then((snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const etapa = (d.data().etapa as string) || '';
        counts[etapa] = (counts[etapa] || 0) + 1;
      });
      setLeadsCountByStage(counts);
    });
  }, [imobiliariaId, localStages]);

  const handleSave = async () => {
    if (!imobiliariaId) return;
    setSaving(true);
    setMessage(null);
    try {
      await setPipelineStagesConfig(imobiliariaId, localStages);
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
    if (oldLabel !== newLabelTrim && imobiliariaId) {
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
    if (removeIndex === null || !imobiliariaId) return;
    const stage = localStages[removeIndex];
    const count = leadsCountByStage[stage.label] || 0;
    if (count > 0 && migrateToStage) {
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

  const resetToDefault = () => {
    if (confirm('Usar o funil padrão do sistema? Sua configuração atual será substituída.')) {
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
        <p className="text-[var(--text-secondary)]">Acesso restrito à imobiliária.</p>
        <Link href="/dashboard/admin" className="text-amber-500 hover:underline mt-2 inline-block">Voltar ao admin</Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard/admin" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white">
          ← Admin
        </Link>
      </div>
      <SectionTitle className="mb-4">Funil de Vendas</SectionTitle>
      <p className="text-sm text-[var(--text-secondary)] dark:text-gray-400 mb-4">
        As etapas abaixo são usadas no CRM (Clientes), relatórios e Dashboards TV. Você pode adicionar, editar, remover e reordenar. Ao renomear, os leads nessa etapa são atualizados. Ao remover uma etapa que tem leads, escolha para qual etapa migrá-los.
      </p>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'ok' ? 'bg-green-500/20 text-green-800 dark:text-green-200 border border-green-500/40' : 'bg-red-500/20 text-red-800 dark:text-red-200 border border-red-500/40'
          }`}
        >
          {message.text}
        </div>
      )}

      {contextLoading ? (
        <p className="text-[var(--text-secondary)]">Carregando funil...</p>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] dark:text-white mb-4">Editar etapa</h3>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da etapa</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] mb-3"
                />
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoria no relatório</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as ReportCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] mb-3"
                >
                  {REPORT_FUNIL_ETAPAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setEditIndex(null)} className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)]">Cancelar</button>
                  <button type="button" onClick={applyEdit} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-medium">Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {removeIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] dark:text-white mb-2">Remover etapa</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  A etapa &quot;{localStages[removeIndex]?.label}&quot; tem {leadsCountByStage[localStages[removeIndex]?.label || ''] || 0} lead(s). Escolha para qual etapa migrá-los antes de remover.
                </p>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Migrar leads para</label>
                <select
                  value={migrateToStage}
                  onChange={(e) => setMigrateToStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] mb-4"
                >
                  {localStages.filter((_, i) => i !== removeIndex).map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={cancelRemove} className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)]">Cancelar</button>
                  <button type="button" onClick={applyRemove} className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium">Remover e migrar</button>
                </div>
              </div>
            </div>
          )}

          {adding && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold text-[var(--text-primary)] dark:text-white mb-4">Nova etapa</h3>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da etapa</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: Proposta enviada"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] mb-3"
                />
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoria no relatório</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ReportCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] mb-3"
                >
                  {REPORT_FUNIL_ETAPAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)]">Cancelar</button>
                  <button type="button" onClick={addStage} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-medium">Adicionar</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              + Adicionar etapa
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            )}
            <button
              type="button"
              onClick={resetToDefault}
              className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              Restaurar funil padrão
            </button>
          </div>
        </>
      )}
    </div>
  );
}
