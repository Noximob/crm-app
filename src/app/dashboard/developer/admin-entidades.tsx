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
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Controle de Permissões por Entidade</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Configure quais funcionalidades cada tipo de usuário pode acessar. 
          <br />
          <strong>Imobiliária (matriz):</strong> Pode ter acesso administrativo
          <br />
          <strong>Corretores:</strong> Acesso limitado às funcionalidades básicas
        </p>
      </div>

      {/* Imobiliária */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-[#3478F6] dark:text-[#A3C8F7]">Imobiliária: Imob Exemplo</h4>
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded">Ativa</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Treinamento</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Acesso aos treinamentos e materiais</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Incluir Imóvel</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Cadastro de novos imóveis</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Área do Administrador</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Painel administrativo da imobiliária</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Área do Desenvolvedor</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" disabled />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6] opacity-50"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Apenas superadmin/desenvolvedor</p>
          </div>
        </div>
      </div>

      {/* Corretor Autônomo */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-[#3478F6] dark:text-[#A3C8F7]">Corretor Autônomo: Carlos Autônomo</h4>
          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs rounded">Inativo</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Treinamento</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Acesso aos treinamentos e materiais</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Incluir Imóvel</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Cadastro de novos imóveis</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Área do Administrador</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" disabled />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6] opacity-50"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Não disponível para corretores</p>
          </div>

          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Área do Desenvolvedor</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" disabled />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6] opacity-50"></div>
              </label>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Apenas superadmin/desenvolvedor</p>
          </div>
        </div>
      </div>

      {/* Ações em Lote */}
      <div className="mt-8 p-4 bg-[#F5F6FA] dark:bg-[#23283A] rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
        <h4 className="text-md font-semibold mb-3 text-[#2E2F38] dark:text-white">Ações em Lote</h4>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-xs bg-[#3478F6] text-white rounded hover:bg-[#2E6FD9] transition-colors">
            Liberar Treinamento para Todos
          </button>
          <button className="px-3 py-1 text-xs bg-[#3478F6] text-white rounded hover:bg-[#2E6FD9] transition-colors">
            Bloquear Incluir Imóvel para Todos
          </button>
          <button className="px-3 py-1 text-xs bg-[#3478F6] text-white rounded hover:bg-[#2E6FD9] transition-colors">
            Liberar Área Admin para Imobiliárias
          </button>
        </div>
      </div>
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