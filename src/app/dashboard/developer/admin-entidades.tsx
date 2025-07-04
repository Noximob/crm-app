import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { label: 'Permissões', value: 'permissoes' },
  { label: 'Corretores', value: 'corretores' },
  { label: 'Imobiliárias', value: 'imobiliarias' },
  { label: 'Transferência de Leads', value: 'transferencia' },
];

export default function AdminEntidades() {
  // const { currentUser } = useAuth();
  // const isDev = currentUser?.role === 'superadmin' || currentUser?.acessoDesenvolvedor;
  const [tab, setTab] = useState('permissoes');

  // if (!isDev) {
  //   return (
  //     <div className="text-center text-red-500 font-bold py-10">Acesso restrito à Administração de Entidades.</div>
  //   );
  // }

  return (
    <section className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-[#2E2F38] dark:text-white flex items-center gap-2">
        Administração de Entidades
        <span className="text-xs font-normal text-[#6B6F76] dark:text-[#E8E9F1]">(Somente superadmin/desenvolvedor)</span>
      </h2>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${tab === t.value
              ? 'bg-[#3478F6] text-white border-[#3478F6]'
              : 'bg-[#F5F6FA] dark:bg-[#23283A] text-[#3478F6] border-transparent hover:bg-[#E8E9F1] dark:hover:bg-[#23283A]'}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Conteúdo das Abas */}
      <div className="mt-4">
        {tab === 'permissoes' && <PermissoesPlaceholder />}
        {tab === 'corretores' && <CorretoresPlaceholder />}
        {tab === 'imobiliarias' && <ImobiliariasPlaceholder />}
        {tab === 'transferencia' && <TransferenciaPlaceholder />}
      </div>
    </section>
  );
}

function PermissoesPlaceholder() {
  return <div className="text-[#6B6F76] dark:text-[#E8E9F1]">(Em breve: Permissões - tabela de usuários e permissões)</div>;
}
function CorretoresPlaceholder() {
  return <div className="text-[#6B6F76] dark:text-[#E8E9F1]">(Em breve: Corretores - listagem e ações)</div>;
}
function ImobiliariasPlaceholder() {
  return <div className="text-[#6B6F76] dark:text-[#E8E9F1]">(Em breve: Imobiliárias - listagem e ações)</div>;
}
function TransferenciaPlaceholder() {
  return <div className="text-[#6B6F76] dark:text-[#E8E9F1]">(Em breve: Transferência de Leads - filtros e seleção)</div>;
} 