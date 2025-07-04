import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { label: 'Imobiliárias', value: 'imobiliarias' },
  { label: 'Corretores', value: 'corretores' },
  { label: 'Leads', value: 'leads' },
  { label: 'Permissões', value: 'permissoes' },
  { label: 'Desenvolvedores', value: 'devs' },
];

export default function AdminEntidades() {
  // const { currentUser } = useAuth();
  // const isDev = currentUser?.role === 'superadmin' || currentUser?.acessoDesenvolvedor;
  const [tab, setTab] = useState('imobiliarias');

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
        {tab === 'imobiliarias' && <ImobiliariasMock />}
        {tab === 'corretores' && <CorretoresMock />}
        {tab === 'leads' && <LeadsMock />}
        {tab === 'permissoes' && <PermissoesMock />}
        {tab === 'devs' && <DevsMock />}
      </div>
    </section>
  );
}

function ImobiliariasMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2 dark:text-white">Imobiliárias</h3>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Plano</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Corretores</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr className="dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Imob Exemplo</td>
            <td className="px-4 py-2 dark:text-white">Ativo</td>
            <td className="px-4 py-2 text-center dark:text-white">12</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Desativar Plano</button>
              <button className="px-2 py-1 text-xs bg-blue-400/80 rounded">Editar</button>
              <button className="px-2 py-1 text-xs bg-gray-300/80 dark:bg-gray-700 dark:text-white rounded">Ver Corretores</button>
            </td>
          </tr>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Imob Inativa</td>
            <td className="px-4 py-2 text-red-500 dark:text-red-400">Inativo</td>
            <td className="px-4 py-2 text-center dark:text-white">5</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Ativar Plano</button>
              <button className="px-2 py-1 text-xs bg-blue-400/80 rounded">Editar</button>
              <button className="px-2 py-1 text-xs bg-gray-300/80 dark:bg-gray-700 dark:text-white rounded">Ver Corretores</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-[#E8E9F1] mt-2">Corretores de imobiliária inativa ficam automaticamente suspensos.</p>
    </div>
  );
}

function CorretoresMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2 dark:text-white">Corretores</h3>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Email</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Imobiliária</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr className="dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">João Corretor</td>
            <td className="px-4 py-2 dark:text-white">joao@email.com</td>
            <td className="px-4 py-2 text-center dark:text-white">Ativo</td>
            <td className="px-4 py-2 text-center dark:text-white">Imob Exemplo</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-red-400/80 rounded">Suspender</button>
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Trocar Imob</button>
            </td>
          </tr>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Maria Bloqueada</td>
            <td className="px-4 py-2 dark:text-white">maria@email.com</td>
            <td className="px-4 py-2 text-center text-red-500 dark:text-red-400">Bloqueado (Imob)</td>
            <td className="px-4 py-2 text-center dark:text-white">Imob Inativa</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Trocar Imob</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LeadsMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2 dark:text-white">Leads</h3>
      <div className="flex gap-2 mb-2">
        <input className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]" placeholder="Filtrar por imobiliária" />
        <input className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]" placeholder="Filtrar por corretor" />
      </div>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Etapa</th>
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Corretor</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr className="dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Lead Exemplo</td>
            <td className="px-4 py-2 dark:text-white">Prospecção</td>
            <td className="px-4 py-2 dark:text-white">João Corretor</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-red-400/80 rounded">Excluir</button>
              <button className="px-2 py-1 text-xs bg-blue-400/80 rounded">Reatribuir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PermissoesMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2 dark:text-white">Permissões</h3>
      <input className="px-2 py-1 border rounded text-sm mb-2 dark:bg-[#181C23] dark:text-white dark:border-[#23283A]" placeholder="Buscar por nome ou email" />
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Usuário</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">CRM</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Dashboard</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Tarefas</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Treinamentos</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Acesso Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">admin@email.com</td>
            <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
            <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
            <td className="px-4 py-2 text-center"><input type="checkbox" readOnly /></td>
            <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
            <td className="px-4 py-2 text-center"><input type="checkbox" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DevsMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Desenvolvedores</h3>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300">
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-center">Acesso</th>
            <th className="px-4 py-2 text-center">Comentários</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">Dev Exemplo</td>
            <td className="px-4 py-2">dev@email.com</td>
            <td className="px-4 py-2 text-center">Ativo</td>
            <td className="px-4 py-2 text-center"><input className="px-2 py-1 border rounded text-xs" placeholder="Comentário interno" /></td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-red-400/80 rounded">Revogar</button>
              <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Conceder</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
} 