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
        <span className="text-xs font-normal text-[#6B6F76] dark:text-gray-400">(Somente superadmin/desenvolvedor)</span>
      </h2>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${tab === t.value
              ? 'bg-[#3478F6] text-white border-[#3478F6]'
              : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#3478F6] border-transparent hover:bg-[#E8E9F1] dark:hover:bg-[#23283A]'}
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
      <h3 className="text-lg font-bold mb-2">Imobiliárias</h3>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300">
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Plano</th>
            <th className="px-4 py-2 text-center">Corretores</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">Imob Exemplo</td>
            <td className="px-4 py-2">Ativo</td>
            <td className="px-4 py-2 text-center">12</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Desativar Plano</button>
              <button className="px-2 py-1 text-xs bg-blue-400/80 rounded">Editar</button>
              <button className="px-2 py-1 text-xs bg-gray-300/80 dark:bg-gray-700 rounded">Ver Corretores</button>
            </td>
          </tr>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23]">
            <td className="px-4 py-2">Imob Inativa</td>
            <td className="px-4 py-2 text-red-500">Inativo</td>
            <td className="px-4 py-2 text-center">5</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Ativar Plano</button>
              <button className="px-2 py-1 text-xs bg-blue-400/80 rounded">Editar</button>
              <button className="px-2 py-1 text-xs bg-gray-300/80 dark:bg-gray-700 rounded">Ver Corretores</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">Corretores de imobiliária inativa ficam automaticamente suspensos.</p>
    </div>
  );
}

function CorretoresMock() {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Corretores</h3>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300">
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-center">Status</th>
            <th className="px-4 py-2 text-center">Imobiliária</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">João Corretor</td>
            <td className="px-4 py-2">joao@email.com</td>
            <td className="px-4 py-2 text-center">Ativo</td>
            <td className="px-4 py-2 text-center">Imob Exemplo</td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-red-400/80 rounded">Suspender</button>
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Trocar Imob</button>
            </td>
          </tr>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23]">
            <td className="px-4 py-2">Maria Bloqueada</td>
            <td className="px-4 py-2">maria@email.com</td>
            <td className="px-4 py-2 text-center text-red-500">Bloqueado (Imob)</td>
            <td className="px-4 py-2 text-center">Imob Inativa</td>
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
      <h3 className="text-lg font-bold mb-2">Leads</h3>
      <div className="flex gap-2 mb-2">
        <input className="px-2 py-1 border rounded text-sm" placeholder="Filtrar por imobiliária" />
        <input className="px-2 py-1 border rounded text-sm" placeholder="Filtrar por corretor" />
      </div>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300">
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Etapa</th>
            <th className="px-4 py-2 text-left">Corretor</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">Lead Exemplo</td>
            <td className="px-4 py-2">Prospecção</td>
            <td className="px-4 py-2">João Corretor</td>
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
      <h3 className="text-lg font-bold mb-2">Permissões</h3>
      <input className="px-2 py-1 border rounded text-sm mb-2" placeholder="Buscar por nome ou email" />
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300">
            <th className="px-4 py-2 text-left">Usuário</th>
            <th className="px-4 py-2 text-center">CRM</th>
            <th className="px-4 py-2 text-center">Dashboard</th>
            <th className="px-4 py-2 text-center">Tarefas</th>
            <th className="px-4 py-2 text-center">Treinamentos</th>
            <th className="px-4 py-2 text-center">Acesso Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">admin@email.com</td>
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