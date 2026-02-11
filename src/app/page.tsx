'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlummaLogoFullInline } from '@/components/AlummaLogo';

export default function LandingPage() {
  const { currentUser, isApproved } = useAuth();
  const isLoggedIn = Boolean(currentUser && isApproved);

  return (
    <div className="min-h-screen bg-particles text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 [filter:drop-shadow(0_0_8px_rgba(255,140,0,0.3))]">
            <AlummaLogoFullInline theme="dark" height={32} />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="#solucoes" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Soluções</Link>
            <Link href="#diferencial" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Diferencial</Link>
            <Link href="/entrar" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Entrar</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_14px_rgba(255,140,0,0.25)]">
                Acessar plataforma
              </Link>
            ) : (
              <Link href="/cadastro" className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_14px_rgba(255,140,0,0.25)]">
                Começar agora
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-4 animate-fade-in">Para imobiliárias de alta performance</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Venda mais. <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">Organize tudo.</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            CRM que une corretores, metas, dashboards para TV e relatórios em um só lugar. Feito para quem não para.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/entrar"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_24px_rgba(255,140,0,0.35)] hover:shadow-[0_0_32px_rgba(255,140,0,0.45)]"
            >
              Acessar a plataforma
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link href="/cadastro" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-orange-500/50 text-orange-400 font-bold text-lg hover:bg-orange-500/10 transition-all">
              Criar conta
            </Link>
          </div>
        </div>
      </section>

      {/* Soluções */}
      <section id="solucoes" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Tudo que sua imobiliária precisa</h2>
          <p className="text-text-secondary text-center max-w-xl mx-auto mb-16">Um único sistema para gestão, acompanhamento e resultado.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'CRM inteligente', desc: 'Leads, funil e tarefas do dia na palma da mão.', icon: '📋' },
              { title: 'Metas e resultados', desc: 'Acompanhe trimestral e mensal. Quem vendeu, quanto falta.', icon: '🎯' },
              { title: 'Dashboards para TV', desc: 'Telas para sala da imobiliária: agenda, funil, metas.', icon: '📺' },
              { title: 'Relatórios e storytelling', desc: 'Relatório individual por corretor. Pronto para enviar.', icon: '📊' },
            ].map((item, i) => (
              <div key={i} className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/40 transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r opacity-80 group-hover:opacity-100" />
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferencial */}
      <section id="diferencial" className="py-24 px-4 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Por que Alumma?</h2>
          <p className="text-text-secondary mb-12">Criatividade e foco em resultado. Não é mais um CRM genérico.</p>
          <ul className="space-y-6 text-left max-w-md mx-auto">
            {[
              'Agenda do dia que prioriza o que importa.',
              'Comunidade e ideias para corretores engajados.',
              'Moedas e gamificação para manter o time ligado.',
              'Relatórios prontos para gerente e análise.',
            ].map((line, i) => (
              <li key={i} className="flex items-center gap-3 text-text-primary">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-glow rounded-3xl p-12 relative overflow-hidden border-orange-500/30">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Pronto para vender mais?</h2>
            <p className="text-text-secondary mb-8">Acesse a plataforma ou crie sua conta. Simples assim.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/entrar" className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_20px_rgba(255,140,0,0.3)]">
                Entrar
              </Link>
              <Link href="/cadastro" className="px-8 py-4 rounded-xl border-2 border-orange-500/50 text-orange-400 font-bold hover:bg-orange-500/10 transition-all">
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <AlummaLogoFullInline theme="dark" height={24} />
          <p className="text-xs text-text-secondary">© Alumma. Soluções para imobiliárias de alta performance.</p>
        </div>
      </footer>
    </div>
  );
}
