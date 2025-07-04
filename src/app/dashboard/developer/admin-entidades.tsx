import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { label: 'Permissões', value: 'permissoes' },
  { label: 'Imobiliárias', value: 'imobiliarias' },
  { label: 'Corretores', value: 'corretores' },
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
        {tab === 'permissoes' && <PermissoesMockup />}
        {tab === 'imobiliarias' && <ImobiliariasMockup />}
        {tab === 'corretores' && <CorretoresMockup />}
        {tab === 'transferencia' && <TransferenciaMockup />}
      </div>
    </section>
  );
}

function ImobiliariasMockup() {
  return (
    <div>
      <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
            <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Imobiliária / Autônomo</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Corretores</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status</th>
            <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr className="dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Imob Exemplo</td>
            <td className="px-4 py-2 text-center dark:text-white">12</td>
            <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Ativa</span></td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Desativar</button>
            </td>
          </tr>
          <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
            <td className="px-4 py-2 dark:text-white">Carlos Autônomo (Autônomo)</td>
            <td className="px-4 py-2 text-center dark:text-white">1</td>
            <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Inativa</span></td>
            <td className="px-4 py-2 text-center flex gap-2 justify-center">
              <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Ativar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1] mt-2">Corretor autônomo aparece como imobiliária própria para controle de permissões e ativação.</p>
    </div>
  );
}

function CorretoresMockup() {
  return (
    <div>
      <input className="px-2 py-1 border rounded text-sm mb-4 dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full max-w-xs" placeholder="Filtrar por imobiliária" />
      <div className="mb-6">
        <div className="font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2">Imobiliária: Imob Exemplo</div>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden mb-2">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">E-mail</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Último Acesso</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Leads Ativos</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Leads Geladeira</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status Integração</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">João Corretor</td>
              <td className="px-4 py-2 dark:text-white">joao@email.com</td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024 14:32</td>
              <td className="px-4 py-2 text-center dark:text-white">8</td>
              <td className="px-4 py-2 text-center dark:text-white">2</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">OK</span></td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-gray-400 text-white rounded">Resetar Senha</button>
                <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Bloquear</button>
              </td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Maria Silva</td>
              <td className="px-4 py-2 dark:text-white">maria@email.com</td>
              <td className="px-4 py-2 text-center dark:text-white">09/07/2024 09:10</td>
              <td className="px-4 py-2 text-center dark:text-white">4</td>
              <td className="px-4 py-2 text-center dark:text-white">1</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Erro</span></td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-gray-400 text-white rounded">Resetar Senha</button>
                <button className="px-2 py-1 text-xs bg-green-500 text-white rounded">Desbloquear</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <div className="font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2">Corretor Autônomo</div>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">E-mail</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Último Acesso</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Leads Ativos</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Leads Geladeira</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status Integração</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Carlos Autônomo</td>
              <td className="px-4 py-2 dark:text-white">carlos@autonomo.com</td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024 08:00</td>
              <td className="px-4 py-2 text-center dark:text-white">3</td>
              <td className="px-4 py-2 text-center dark:text-white">0</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">OK</span></td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-gray-400 text-white rounded">Resetar Senha</button>
                <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Bloquear</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissoesMockup() {
  return (
    <div>
      <input className="px-2 py-1 border rounded text-sm mb-4 dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full max-w-xs" placeholder="Buscar por nome, email ou imobiliária" />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Usuário</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Tipo</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">CRM</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Dashboard</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Tarefas</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Treinamentos</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Acesso Total</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {/* Corretor Autônomo */}
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">joao@email.com</td>
              <td className="px-4 py-2 dark:text-white">Corretor Autônomo</td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
            </tr>
            {/* Imobiliária */}
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">imob@exemplo.com</td>
              <td className="px-4 py-2 dark:text-white">Imobiliária</td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
              <td className="px-4 py-2 text-center"><input type="checkbox" checked readOnly /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1] mt-2">Permissões podem ser editadas instantaneamente para cada usuário ou imobiliária.</p>
    </div>
  );
}

function TransferenciaMockup() {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]">
          <option>Imob Exemplo</option>
          <option>Carlos Autônomo</option>
        </select>
        <select className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]">
          <option>João Corretor</option>
          <option>Maria Silva</option>
        </select>
        <select className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]">
          <option>Maria Silva</option>
          <option>João Corretor</option>
        </select>
        <select className="px-2 py-1 border rounded text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A]">
          <option>Geladeira</option>
          <option>Pós-venda</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden mb-4">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Lead</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Categoria</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Selecionar</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Lead 1</td>
              <td className="px-4 py-2 dark:text-white">Geladeira</td>
              <td className="px-4 py-2"><input type="checkbox" /></td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Lead 2</td>
              <td className="px-4 py-2 dark:text-white">Pós-venda</td>
              <td className="px-4 py-2"><input type="checkbox" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Transferir Leads</button>
      <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1] mt-2">Selecione um ou vários leads para transferir entre corretores da mesma imobiliária ou grupo.</p>
    </div>
  );
} 