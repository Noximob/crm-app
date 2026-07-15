'use client';

import React from 'react';
import Link from 'next/link';

// Paleta GX rotativa para os tiles de atalho
const gxTilePalette = [
  { b: 'border-[#FF1E56]/35 hover:border-[#FF1E56]/70', bg: 'bg-[#FF1E56]/[0.05] hover:bg-[#FF1E56]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(255,30,86,0.5)]', chip: 'from-[#FF1E56]/25 to-[#FF1E56]/[0.03] border-[#FF1E56]/30', accent: 'text-[#FF7A97]' },
  { b: 'border-[#E8C547]/35 hover:border-[#E8C547]/70', bg: 'bg-[#E8C547]/[0.05] hover:bg-[#E8C547]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(232,197,71,0.45)]', chip: 'from-[#E8C547]/25 to-[#E8C547]/[0.03] border-[#E8C547]/40', accent: 'text-[#FFE9A6]' },
  { b: 'border-[#34D399]/35 hover:border-[#34D399]/70', bg: 'bg-[#34D399]/[0.05] hover:bg-[#34D399]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.45)]', chip: 'from-[#34D399]/25 to-[#34D399]/[0.03] border-[#34D399]/30', accent: 'text-emerald-300' },
  { b: 'border-[#9F6BFF]/35 hover:border-[#9F6BFF]/70', bg: 'bg-[#9F6BFF]/[0.05] hover:bg-[#9F6BFF]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(159,107,255,0.45)]', chip: 'from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border-[#9F6BFF]/30', accent: 'text-[#C4A6FF]' },
  { b: 'border-[#7DD3FC]/35 hover:border-[#7DD3FC]/70', bg: 'bg-[#7DD3FC]/[0.05] hover:bg-[#7DD3FC]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(125,211,252,0.45)]', chip: 'from-[#7DD3FC]/25 to-[#7DD3FC]/[0.03] border-[#7DD3FC]/30', accent: 'text-[#7DD3FC]' },
];

// Categorias organizadas para melhor UX (aprovação de corretores fica na área do Desenvolvedor)
const adminCategories = [
  {
    title: 'Equipe',
    description: 'Corretores, acessos e leads',
    icon: '👥',
    color: 'from-[#FF1E56]/25 to-[#FF1E56]/[0.03] border-[#FF1E56]/30',
    items: [
      { title: 'Gestão de Corretores e Leads', icon: '🧑‍💼', description: 'Transfira, redistribua e exclua leads; acompanhe cada corretor', href: '/dashboard/admin/gestao-corretores' },
      { title: 'Distribuição de Anúncios', icon: '📣', description: 'Escala, rodízio e tempos dos leads de propaganda', href: '/dashboard/admin/distribuicao-ads' },
      { title: 'Visualizar CRM do corretor', icon: '🔎', description: 'Veja os leads e tarefas de um corretor específico', href: '/dashboard/admin/visualizar-crm-corretor' },
      { title: 'Agenda dos Usuários', icon: '📅', description: 'Visualize a agenda de todos os usuários', href: '/dashboard/admin/agenda-usuarios' },
      { title: 'Importar Leads', icon: '⬆️', description: 'Importe leads em massa', href: '/dashboard/admin/importar-leads' },
    ]
  },
  {
    title: 'Imobiliária',
    description: 'Rotina, captações e conteúdo',
    icon: '🏢',
    color: 'from-[#34D399]/25 to-[#34D399]/[0.03] border-[#34D399]/30',
    items: [
      { title: 'Agenda Imobiliária', icon: '📆', description: 'Gerencie agenda e plantões da imobiliária', href: '/dashboard/admin/agenda-imobiliaria' },
      { title: 'Materiais Construtora', icon: '🏗️', description: 'Materiais das construtoras', href: '/dashboard/admin/materiais-construtora' },
      { title: 'Ligação Ativa (roteiro)', icon: '📞', description: 'Edite o mapa mental da ligação ativa: mensagens, passos e botões', href: '/dashboard/admin/ligacao-ativa' },
      { title: 'Documentos da Imobiliária', icon: '📁', description: 'Treinamentos, slides de contratação e materiais internos — só do admin', href: '/dashboard/admin/documentos' },
      { title: 'Academia', icon: '🎓', description: 'Materiais educacionais', href: '/dashboard/admin/treinamentos' },
    ]
  },
  {
    title: 'Financeiro e Metas',
    description: 'Comissões, metas e relatórios',
    icon: '💰',
    color: 'from-[#E8C547]/25 to-[#E8C547]/[0.03] border-[#E8C547]/40',
    items: [
      { title: 'Comissões', icon: '💵', description: 'Imposto, meta, política de comissão e lançamento de vendas por equipe', href: '/dashboard/admin/comissoes' },
      { title: 'Metas', icon: '🎯', description: 'Meta da imobiliária e soma das metas dos corretores', href: '/dashboard/admin/metas' },
      { title: 'Meets & Visitas', icon: '🔥', description: 'Período contado, contadores por corretor e histórico do pódio da home', href: '/dashboard/admin/meets-visitas' },
      { title: 'Relatórios', icon: '📈', description: 'Pulso do período, funil, ranking da equipe, individual × coletivo e origens de leads', href: '/dashboard/admin/relatorios' },
      { title: 'Dashboards TV', icon: '📺', description: 'Telas para TV da imobiliária', href: '/dashboard/admin/dashboards-tv' },
    ]
  },
  {
    title: 'Configurações',
    description: 'Estrutura do CRM',
    icon: '⚙️',
    color: 'from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border-[#9F6BFF]/30',
    items: [
      { title: 'Funil de Vendas', icon: '📊', description: 'Adicionar, editar ou remover etapas do funil (CRM)', href: '/dashboard/admin/funil-vendas' },
    ]
  }
];

export default function AdminPage() {
  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="gx-tag mb-2 inline-flex"><span>Painel de controle</span></span>
          <h1 className="al-display text-3xl font-bold text-white uppercase tracking-wide">Área do Administrador</h1>
          <p className="text-text-secondary mt-1">Tudo da sua imobiliária, organizado por setor. Aprovação de novos corretores fica na área do Desenvolvedor.</p>
        </div>

        {/* Setores */}
        <div className="space-y-9">
          {adminCategories.map((category, ci) => (
            <section key={category.title}>
              {/* Cabeçalho do setor */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br border ${category.color} flex items-center justify-center text-xl shrink-0`}>
                  {category.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] leading-tight">{category.title}</h2>
                  <p className="text-xs text-text-secondary">{category.description}</p>
                </div>
                <div className="flex-1 gx-line opacity-30 ml-1" />
                <span className="shrink-0 text-[11px] font-semibold text-text-secondary tabular-nums px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">{category.items.length}</span>
              </div>

              {/* Itens do setor */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item, ii) => {
                  const gx = gxTilePalette[(ci + ii) % gxTilePalette.length];
                  return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group relative overflow-hidden flex items-center gap-3.5 p-4 rounded-2xl border ${gx.b} ${gx.bg} ${gx.glow} hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200`}
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                    <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br border ${gx.chip} flex items-center justify-center text-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white transition-colors truncate">{item.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                    </div>
                    <span className={`shrink-0 ${gx.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`}>→</span>
                  </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
