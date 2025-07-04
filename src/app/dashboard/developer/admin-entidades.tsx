import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { label: 'Entidades e Planos', value: 'entidades' },
  { label: 'Gestão de Leads', value: 'leads' },
  { label: 'Permissões', value: 'permissoes' },
  { label: 'Monitoramento', value: 'monitoramento' },
];

export default function AdminEntidades() {
  // const { currentUser } = useAuth();
  // const isDev = currentUser?.role === 'superadmin' || currentUser?.acessoDesenvolvedor;
  const [tab, setTab] = useState('entidades');

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
        {tab === 'entidades' && <EntidadesMockup />}
        {tab === 'leads' && <GestaoLeadsMockup />}
        {tab === 'permissoes' && <PermissoesMockup />}
        {tab === 'monitoramento' && <MonitoramentoMockup />}
      </div>
    </section>
  );
}

function EntidadesMockup() {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Entidades e Planos</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Gerencie imobiliárias, corretores autônomos e seus planos de acesso.
        </p>
      </div>

      {/* Imobiliárias */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Imobiliárias</h4>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Imobiliária</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Corretores</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status Plano</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Último Pagamento</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Imob Exemplo</td>
              <td className="px-4 py-2 text-center dark:text-white">12</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Ativo</span></td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024</td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Ver Corretores</button>
                <button className="px-2 py-1 text-xs bg-yellow-400/80 rounded">Suspender</button>
              </td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Imob Premium</td>
              <td className="px-4 py-2 text-center dark:text-white">8</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Suspenso</span></td>
              <td className="px-4 py-2 text-center dark:text-white">05/07/2024</td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Ver Corretores</button>
                <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Reativar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Corretores Autônomos */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Corretores Autônomos</h4>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">E-mail</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status Plano</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Último Pagamento</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Carlos Autônomo</td>
              <td className="px-4 py-2 dark:text-white">carlos@autonomo.com</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Suspenso</span></td>
              <td className="px-4 py-2 text-center dark:text-white">01/07/2024</td>
              <td className="px-4 py-2 text-center flex gap-2 justify-center">
                <button className="px-2 py-1 text-xs bg-green-400/80 rounded">Reativar</button>
                <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Corretores por Imobiliária */}
      <div>
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Corretores por Imobiliária</h4>
        <div className="mb-4">
          <div className="font-bold text-[#2E2F38] dark:text-white mb-2">Imobiliária: Imob Exemplo</div>
          <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
                <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Nome</th>
                <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">E-mail</th>
                <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status</th>
                <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Leads Ativos</th>
                <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="dark:bg-[#23283A]">
                <td className="px-4 py-2 dark:text-white">João Corretor</td>
                <td className="px-4 py-2 dark:text-white">joao@email.com</td>
                <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Ativo</span></td>
                <td className="px-4 py-2 text-center dark:text-white">8</td>
                <td className="px-4 py-2 text-center flex gap-2 justify-center">
                  <button className="px-2 py-1 text-xs bg-gray-400 text-white rounded">Resetar Senha</button>
                  <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Bloquear</button>
                </td>
              </tr>
              <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
                <td className="px-4 py-2 dark:text-white">Maria Silva</td>
                <td className="px-4 py-2 dark:text-white">maria@email.com</td>
                <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">Bloqueado</span></td>
                <td className="px-4 py-2 text-center dark:text-white">4</td>
                <td className="px-4 py-2 text-center flex gap-2 justify-center">
                  <button className="px-2 py-1 text-xs bg-gray-400 text-white rounded">Resetar Senha</button>
                  <button className="px-2 py-1 text-xs bg-green-500 text-white rounded">Desbloquear</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GestaoLeadsMockup() {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Gestão de Leads</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Transfira leads entre corretores da mesma imobiliária ou exclua leads específicos.
        </p>
      </div>

      {/* Seleção de Imobiliária */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Imobiliária</label>
        <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full max-w-xs">
          <option>Selecione uma imobiliária</option>
          <option>Imob Exemplo</option>
          <option>Imob Premium</option>
        </select>
      </div>

      {/* Corretores Origem e Destino */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Corretor Origem</label>
          <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full">
            <option>Selecione o corretor origem</option>
            <option>João Corretor (8 leads)</option>
            <option>Maria Silva (4 leads)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Corretor Destino</label>
          <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full">
            <option>Selecione o corretor destino</option>
            <option>João Corretor (8 leads)</option>
            <option>Maria Silva (4 leads)</option>
          </select>
        </div>
      </div>

      {/* Filtros por Etapa */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Filtrar por Etapa</label>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Todos os Leads</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Geladeira</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Pré-qualificação</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Qualificado</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Proposta</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-[#2E2F38] dark:text-white">Fechado</span>
          </label>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors">
          Transferir Leads Selecionados
        </button>
        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          Excluir Leads Selecionados
        </button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
          Mover para Geladeira
        </button>
      </div>

      {/* Lista de Leads */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-[#3478F6] dark:text-[#A3C8F7]">Leads Disponíveis para Transferência</h4>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">
                <input type="checkbox" className="mr-2" />
                Lead
              </th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Cliente</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Etapa</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Última Atividade</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">
                <input type="checkbox" className="mr-2" />
                #001
              </td>
              <td className="px-4 py-2 dark:text-white">João Silva</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">Pré-qualificação</span></td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024</td>
              <td className="px-4 py-2 text-center">
                <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Excluir</button>
              </td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">
                <input type="checkbox" className="mr-2" />
                #002
              </td>
              <td className="px-4 py-2 dark:text-white">Maria Santos</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs">Geladeira</span></td>
              <td className="px-4 py-2 text-center dark:text-white">08/07/2024</td>
              <td className="px-4 py-2 text-center">
                <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Excluir</button>
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
        <h3 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Controle de Permissões</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Configure permissões por tipo de usuário e aplique em lote.
        </p>
      </div>

      {/* Permissões por Tipo */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Permissões por Tipo de Usuário</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Imobiliárias */}
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <h5 className="font-semibold mb-3 text-[#2E2F38] dark:text-white">🏢 Imobiliárias</h5>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-[#2E2F38] dark:text-white">Treinamento</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-[#2E2F38] dark:text-white">Incluir Imóvel</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-[#2E2F38] dark:text-white">Área do Administrador</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" disabled />
                <span className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Área do Desenvolvedor</span>
              </label>
            </div>
          </div>

          {/* Corretores */}
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <h5 className="font-semibold mb-3 text-[#2E2F38] dark:text-white">👤 Corretores</h5>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-[#2E2F38] dark:text-white">Treinamento</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-[#2E2F38] dark:text-white">Incluir Imóvel</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" disabled />
                <span className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Área do Administrador</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" disabled />
                <span className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Área do Desenvolvedor</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Ações em Lote */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Ações em Lote</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Liberar Treinamento para Todos
          </button>
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Bloquear Incluir Imóvel para Corretores
          </button>
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Liberar Área Admin para Imobiliárias
          </button>
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Aplicar Permissões Padrão
          </button>
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Resetar Todas as Permissões
          </button>
        </div>
      </div>

      {/* Permissões Específicas */}
      <div>
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Permissões Específicas por Entidade</h4>
        <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
          <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-3">
            Configure permissões específicas para entidades individuais quando necessário.
          </p>
          <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors text-sm">
            Gerenciar Permissões Específicas
          </button>
        </div>
      </div>
    </div>
  );
}

function MonitoramentoMockup() {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Monitoramento do Sistema</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Acompanhe o status de integrações, acessos e métricas de uso.
        </p>
      </div>

      {/* Status de Integrações */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Status de Integrações</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Firebase</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">OK</span>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Última verificação: 2 min atrás</p>
          </div>
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Google Auth</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">OK</span>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Última verificação: 1 min atrás</p>
          </div>
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#2E2F38] dark:text-white">Netlify</span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">OK</span>
            </div>
            <p className="text-xs text-[#6B6F76] dark:text-[#E8E9F1]">Última verificação: 5 min atrás</p>
          </div>
        </div>
      </div>

      {/* Últimos Acessos */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Últimos Acessos</h4>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Usuário</th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Tipo</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Último Acesso</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">joao@email.com</td>
              <td className="px-4 py-2 dark:text-white">Corretor</td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024 14:32</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Online</span></td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">maria@email.com</td>
              <td className="px-4 py-2 dark:text-white">Corretor</td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024 09:10</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs">Offline</span></td>
            </tr>
            <tr className="dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">admin@imob.com</td>
              <td className="px-4 py-2 dark:text-white">Imobiliária</td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024 08:00</td>
              <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs">Offline</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Métricas de Uso */}
      <div>
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Métricas de Uso</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <div className="text-2xl font-bold text-[#3478F6] dark:text-[#A3C8F7]">156</div>
            <div className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Usuários Ativos</div>
          </div>
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <div className="text-2xl font-bold text-[#3478F6] dark:text-[#A3C8F7]">2.847</div>
            <div className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Leads Totais</div>
          </div>
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <div className="text-2xl font-bold text-[#3478F6] dark:text-[#A3C8F7]">23</div>
            <div className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Imobiliárias</div>
          </div>
          <div className="bg-[#F5F6FA] dark:bg-[#23283A] p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <div className="text-2xl font-bold text-[#3478F6] dark:text-[#A3C8F7]">98.5%</div>
            <div className="text-sm text-[#6B6F76] dark:text-[#E8E9F1]">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
} 