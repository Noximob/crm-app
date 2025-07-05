import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PIPELINE_STAGES } from '@/lib/constants';

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
              <td className="px-4 py-2 text-center">
                <span className="px-3 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs w-20 inline-block">Ativo</span>
              </td>
              <td className="px-4 py-2 text-center dark:text-white">10/07/2024</td>
              <td className="px-4 py-2 text-center">
                <div className="flex gap-1 justify-center">
                  <button className="px-3 py-1 text-xs bg-yellow-400/80 rounded w-20">Suspender</button>
                  <button className="px-3 py-1 text-xs bg-red-500 text-white rounded w-16">Excluir</button>
                </div>
              </td>
            </tr>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A]">
              <td className="px-4 py-2 dark:text-white">Imob Premium</td>
              <td className="px-4 py-2 text-center dark:text-white">8</td>
              <td className="px-4 py-2 text-center">
                <span className="px-3 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs w-20 inline-block">Suspenso</span>
              </td>
              <td className="px-4 py-2 text-center dark:text-white">05/07/2024</td>
              <td className="px-4 py-2 text-center">
                <div className="flex gap-1 justify-center">
                  <button className="px-3 py-1 text-xs bg-green-400/80 rounded w-20">Reativar</button>
                  <button className="px-3 py-1 text-xs bg-red-500 text-white rounded w-16">Excluir</button>
                </div>
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
              <td className="px-4 py-2 text-center">
                <span className="px-3 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs w-20 inline-block">Suspenso</span>
              </td>
              <td className="px-4 py-2 text-center dark:text-white">01/07/2024</td>
              <td className="px-4 py-2 text-center">
                <div className="flex gap-1 justify-center">
                  <button className="px-3 py-1 text-xs bg-green-400/80 rounded w-20">Reativar</button>
                  <button className="px-3 py-1 text-xs bg-red-500 text-white rounded w-16">Excluir</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Corretores por Imobiliária */}
      <div>
        <h4 className="text-md font-semibold mb-4 text-[#3478F6] dark:text-[#A3C8F7]">Corretores por Imobiliária</h4>
        
        {/* Filtro por Imobiliária */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Filtrar por Imobiliária</label>
          <div className="flex gap-2 items-end">
            <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full max-w-xs">
              <option>Selecione uma imobiliária</option>
              <option>Imob Exemplo</option>
              <option>Imob Premium</option>
            </select>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por nome..." 
                className="px-3 py-2 pr-10 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-48"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#6B6F76] dark:text-[#E8E9F1] hover:text-[#3478F6] dark:hover:text-[#A3C8F7]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

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
              {[
                { nome: 'João Corretor', email: 'joao@email.com', status: 'Ativo', leads: 8 },
                { nome: 'Maria Silva', email: 'maria@email.com', status: 'Suspenso', leads: 4 },
              ].map((corretor, idx) => (
                <tr key={corretor.email} className={idx % 2 === 0 ? 'dark:bg-[#23283A]' : 'bg-[#F5F6FA] dark:bg-[#23283A]'}>
                  <td className="px-4 py-2 dark:text-white">{corretor.nome}</td>
                  <td className="px-4 py-2 dark:text-white">{corretor.email}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-3 py-1 rounded text-xs w-20 inline-block ${corretor.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{corretor.status}</span>
                  </td>
                  <td className="px-4 py-2 text-center dark:text-white">{corretor.leads}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex gap-2 justify-center min-w-[260px]">
                      <button className="px-4 py-1 text-xs bg-gray-400 text-white rounded w-28">Resetar Senha</button>
                      {corretor.status === 'Ativo' ? (
                        <button className="px-4 py-1 text-xs bg-red-500 text-white rounded w-28">Bloquear</button>
                      ) : (
                        <button className="px-4 py-1 text-xs bg-green-500 text-white rounded w-28">Desbloquear</button>
                      )}
                      <button className="px-4 py-1 text-xs bg-red-500 text-white rounded w-20">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GestaoLeadsMockup() {
  const etapas = [
    'Pré Qualificação',
    'Qualificação',
    'Apresentação do imóvel',
    'Ligação agendada',
    'Visita agendada',
    'Negociação e Proposta',
    'Contrato e fechamento',
    'Pós Venda e Fidelização',
    'Geladeira',
  ];

  // Mock de leads do corretor origem
  const allLeads = [
    { id: '#001', cliente: 'João Silva', etapa: 'Qualificação', ultimaAtividade: '10/07/2024' },
    { id: '#002', cliente: 'Maria Santos', etapa: 'Geladeira', ultimaAtividade: '08/07/2024' },
    { id: '#003', cliente: 'Carlos Souza', etapa: 'Pré Qualificação', ultimaAtividade: '09/07/2024' },
    { id: '#004', cliente: 'Ana Paula', etapa: 'Negociação e Proposta', ultimaAtividade: '07/07/2024' },
  ];

  const [etapaSelecionada, setEtapaSelecionada] = useState('');

  // Filtra os leads conforme etapa selecionada
  const leadsFiltrados = etapaSelecionada
    ? allLeads.filter((lead) => lead.etapa === etapaSelecionada)
    : allLeads;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2 text-[#2E2F38] dark:text-white">Gestão de Leads</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Transfira leads entre corretores da mesma imobiliária ou exclua leads específicos.
        </p>
      </div>
      {/* Filtros por etapa estilo pill */}
      <div className="flex flex-wrap gap-2 mb-6">
        {etapas.map((etapa) => (
          <button
            key={etapa}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm shadow-sm transition-colors min-w-fit
              ${etapaSelecionada === etapa ? 'bg-[#3478F6] text-white' : 'bg-[#1A2B49] text-[#A3C8F7] hover:bg-[#3478F6] hover:text-white'}`}
            type="button"
            onClick={() => setEtapaSelecionada(etapaSelecionada === etapa ? '' : etapa)}
          >
            {etapa}
          </button>
        ))}
      </div>
      {/* Seleção de Imobiliária */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Selecionar Imobiliária</label>
        <div className="flex gap-2 items-end">
          <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-full max-w-xs">
            <option>Selecione uma imobiliária</option>
            <option>Imob Exemplo</option>
            <option>Imob Premium</option>
          </select>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
              className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-48"
            />
            <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors">
              Buscar
            </button>
          </div>
        </div>
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
      {/* Ações */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors">
          Transferir Leads Selecionados
        </button>
        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          Excluir Leads Selecionados
        </button>
      </div>
      {/* Lista de Leads filtrada */}
      <div>
        <h4 className="text-md font-semibold mb-3 text-[#3478F6] dark:text-[#A3C8F7]">Leads do Corretor Origem</h4>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">
          Selecione os leads que deseja transferir para o corretor destino ou excluir.
        </p>
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">
                <input type="checkbox" className="mr-2" />
                Lead
              </th>
              <th className="px-4 py-2 text-left dark:text-[#E8E9F1]">Cliente</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Situação</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Última Atividade</th>
              <th className="px-4 py-2 text-center dark:text-[#E8E9F1]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leadsFiltrados.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-[#6B6F76] dark:text-[#E8E9F1]">Nenhum lead encontrado para esta etapa.</td></tr>
            ) : leadsFiltrados.map((lead) => (
              <tr key={lead.id} className="dark:bg-[#23283A]">
                <td className="px-4 py-2 dark:text-white">
                  <input type="checkbox" className="mr-2" />
                  {lead.id}
                </td>
                <td className="px-4 py-2 dark:text-white">{lead.cliente}</td>
                <td className="px-4 py-2 text-center"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">{lead.etapa}</span></td>
                <td className="px-4 py-2 text-center dark:text-white">{lead.ultimaAtividade}</td>
                <td className="px-4 py-2 text-center">
                  <button className="px-2 py-1 text-xs bg-red-500 text-white rounded">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissoesMockup() {
  // Mock de dados para exibição
  const permissoes = [
    { nome: 'Imob Exemplo', tipo: 'Imobiliária', email: 'imob@exemplo.com', incluir: true, treinamentos: true, admin: true },
    { nome: 'Carlos Autônomo', tipo: 'Autônomo', email: 'carlos@autonomo.com', incluir: false, treinamentos: true, admin: false },
    { nome: 'João Corretor', tipo: 'Corretor', imobiliaria: 'Imob Exemplo', email: 'joao@email.com', incluir: true, treinamentos: false, admin: false },
    { nome: 'Maria Silva', tipo: 'Corretor', imobiliaria: 'Imob Exemplo', email: 'maria@email.com', incluir: true, treinamentos: true, admin: false },
  ];

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2 text-[#2E2F38] dark:text-white">Permissões</h3>
        <p className="text-sm text-[#6B6F76] dark:text-[#E8E9F1] mb-4">Gerencie permissões de acesso para imobiliárias, autônomos e corretores.</p>
      </div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <input type="text" placeholder="Buscar por nome ou e-mail..." className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-64" />
        <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-48">
          <option value="">Todos os Tipos</option>
          <option value="Imobiliária">Imobiliária</option>
          <option value="Corretor">Corretor</option>
          <option value="Autônomo">Autônomo</option>
        </select>
        <select className="px-3 py-2 border rounded-lg text-sm dark:bg-[#181C23] dark:text-white dark:border-[#23283A] w-48">
          <option value="">Todas as Imobiliárias</option>
          <option value="Imob Exemplo">Imob Exemplo</option>
        </select>
        <button className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors">Filtrar</button>
      </div>
      {/* Lista de permissões */}
      <div className="overflow-x-auto rounded-xl shadow-soft">
        <table className="min-w-full text-sm bg-white dark:bg-[#23283A] rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-[#E8E9F1]">
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Imobiliária</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-center">Incluir Imóvel</th>
              <th className="px-4 py-3 text-center">Treinamentos</th>
              <th className="px-4 py-3 text-center">Área do Administrador</th>
            </tr>
          </thead>
          <tbody>
            {permissoes.map((item, idx) => (
              <tr key={item.email} className={idx % 2 === 0 ? 'dark:bg-[#23283A]' : 'bg-[#F5F6FA] dark:bg-[#23283A]'}>
                <td className="px-4 py-2 dark:text-white font-medium">{item.nome}</td>
                <td className="px-4 py-2 dark:text-white">{item.tipo}</td>
                <td className="px-4 py-2 dark:text-white">{item.imobiliaria || '-'}</td>
                <td className="px-4 py-2 dark:text-white">{item.email}</td>
                <td className="px-4 py-2 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.incluir} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]" />
                  </label>
                </td>
                <td className="px-4 py-2 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.treinamentos} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]" />
                  </label>
                </td>
                <td className="px-4 py-2 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.admin} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#3478F6]" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          Acompanhe acessos e métricas de uso do sistema.
        </p>
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