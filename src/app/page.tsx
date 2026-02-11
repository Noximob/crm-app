'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlummaLogoFullInline } from '@/components/AlummaLogo';

const WHATSAPP_LINK = 'https://wa.me/5547992577075';
const WHATSAPP_DISPLAY = '47 99257-7075';
const INSTAGRAM_HANDLE = '@alumma.app';
const CONTACT_EMAIL = 'alummaapp@gmail.com';
const GMAIL_COMPOSE_LINK = `https://mail.google.com/mail/?view=cm&to=${CONTACT_EMAIL}`;

export default function LandingPage() {
  const { currentUser, isApproved } = useAuth();
  const isLoggedIn = Boolean(currentUser && isApproved);
  const platformHref = isLoggedIn ? '/dashboard' : '/entrar';

  return (
    <div className="min-h-screen bg-particles text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 [filter:drop-shadow(0_0_8px_rgba(255,140,0,0.3))]">
            <AlummaLogoFullInline theme="dark" height={32} />
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="#solucoes" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Soluções</Link>
            <Link href="#diferencial" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Diferencial</Link>
            <Link href="#contato" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Contato</Link>
            <div className="flex items-center gap-3">
              <a href={`https://instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-text-secondary hover:text-pink-400 hover:bg-white/5 transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href={GMAIL_COMPOSE_LINK} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-text-secondary hover:text-sky-400 hover:bg-white/5 transition-colors" aria-label="E-mail">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            </div>
            <Link href={platformHref} className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_14px_rgba(255,140,0,0.25)]">
              Acessar plataforma
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-4 animate-fade-in">
            Soluções para imobiliárias de alta performance
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Facilidade para o corretor,
            <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent mt-1">
              informação para a imobiliária.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Plataforma única que conecta CRM, site focado em SEO orgânico, dashboards para TV e relatórios em tempo real
            para corretores e gestores de alta performance.
          </p>
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-white font-bold text-lg shadow-[0_0_28px_rgba(16,185,129,0.5)] hover:shadow-[0_0_36px_rgba(16,185,129,0.6)] hover:scale-105 transition-all"
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z" />
              </svg>
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Soluções */}
      <section id="solucoes" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Tudo que sua imobiliária precisa</h2>
          <p className="text-text-secondary text-center max-w-xl mx-auto mb-16">
            Da captação ao relatório final: um ecossistema completo pensado para corretores, coordenadores e diretoria.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Site focado em SEO */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_24px_rgba(255,140,0,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 5h18M3 12h18M3 19h18" />
                  <path d="M7 5v14M17 5v14" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Site focado em SEO orgânico</h3>
              <p className="text-sm text-text-secondary">
                Estrutura pensada para ranquear imóveis e a marca da imobiliária, com foco em conversão e experiência visual.
              </p>
            </div>

            {/* Sistema gamificado */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-sky-500 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 shadow-[0_0_24px_rgba(45,212,191,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M9 3H5a2 2 0 0 0-2 2v4h6z" />
                  <path d="M21 9V5a2 2 0 0 0-2-2h-4v6z" />
                  <path d="M3 13v4a2 2 0 0 0 2 2h4v-6z" />
                  <path d="M15 19h4a2 2 0 0 0 2-2v-4h-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sistema gamificado</h3>
              <p className="text-sm text-text-secondary">
                Metas, moedas e ranking para manter o time engajado e focado em atividades que geram resultado real.
              </p>
            </div>

            {/* Dashboards para TV */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-sky-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-400 to-indigo-500 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-[0_0_24px_rgba(56,189,248,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="5" width="18" height="12" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dashboards para TV</h3>
              <p className="text-sm text-text-secondary">
                Telas ao vivo com funil de vendas, metas, agenda diária e semanal para toda a equipe acompanhar.
              </p>
            </div>

            {/* Relatórios detalhados */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_24px_rgba(251,191,36,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                  <path d="M14 3v6h6" />
                  <path d="M9 17v-4" />
                  <path d="M13 17v-2" />
                  <path d="M17 17v-6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Relatórios detalhados</h3>
              <p className="text-sm text-text-secondary">
                Visão clara de funil, conversão por etapa e origens de lead para apoiar decisões estratégicas da diretoria.
              </p>
            </div>

            {/* Performance individual */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-fuchsia-500 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-fuchsia-500 shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Performance individual</h3>
              <p className="text-sm text-text-secondary">
                Relatórios prontos por corretor, ideais para feedback individual, campanhas de incentivo e planos de ação.
              </p>
            </div>

            {/* Sempre atualizado */}
            <div className="card-glow rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-400/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-r opacity-80 group-hover:opacity-100" />
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 12a9 9 0 0 1 9-9 9.5 9.5 0 0 1 6.36 2.36" />
                  <path d="M21 3v6h-6" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.5 9.5 0 0 1-6.36-2.36" />
                  <path d="M3 21v-6h6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Informação o tempo todo</h3>
              <p className="text-sm text-text-secondary">
                Agenda, funil, dashboards e relatórios sempre sincronizados, para ninguém perder o ritmo da operação.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferencial */}
      <section id="diferencial" className="py-24 px-4 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Por que Alumma?</h2>
          <p className="text-text-secondary mb-12">
            Não é só um CRM: é a base de dados, processos e comunicação da sua imobiliária em um só lugar.
          </p>
          <ul className="space-y-6 text-left max-w-md mx-auto">
            {[
              'Agenda do dia que prioriza o que importa para o corretor e para o funil.',
              'Comunidade e ideias para manter o time conectado ao negócio.',
              'Gamificação e moedas para sustentar a produtividade no longo prazo.',
              'Relatórios prontos para gerente, diretoria e análise de performance.',
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
          <div className="card-glow rounded-3xl p-12 relative overflow-hidden border-emerald-500/30">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Pronto para vender mais?</h2>
            <p className="text-text-secondary mb-8">
              Fale com a gente pelo WhatsApp e entenda se a Alumma faz sentido para sua operação.
            </p>
            <div className="flex justify-center">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-white font-bold shadow-[0_0_28px_rgba(16,185,129,0.5)] hover:shadow-[0_0_36px_rgba(16,185,129,0.6)] hover:scale-105 transition-all"
              >
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z" />
                </svg>
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contato — minimalista */}
      <section id="contato" className="py-12 px-4 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Fale com a gente</h2>
          <p className="text-text-secondary text-sm mb-6">Instagram, e-mail ou WhatsApp. Respondemos rápido.</p>
          <div className="flex items-center justify-center gap-6">
            <a href={`https://instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all" aria-label="Instagram" title={INSTAGRAM_HANDLE}>
              <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href={GMAIL_COMPOSE_LINK} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-sky-400/40 hover:bg-sky-500/10 transition-all" aria-label="E-mail" title={CONTACT_EMAIL}>
              <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-400/40 hover:bg-emerald-500/10 transition-all" aria-label="WhatsApp" title={WHATSAPP_DISPLAY}>
              <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z"/></svg>
            </a>
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

      {/* Balões flutuantes: WhatsApp + Instagram + E-mail */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3" aria-label="Contato">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          title={`WhatsApp ${WHATSAPP_DISPLAY}`}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
        >
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z" />
          </svg>
        </a>
        <a
          href={`https://instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          title={INSTAGRAM_HANDLE}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-pink-500/30 hover:border-pink-400/50 hover:scale-105 transition-all"
        >
          <svg className="w-5 h-5 text-pink-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
        <a
          href={GMAIL_COMPOSE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          title={CONTACT_EMAIL}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-sky-500/30 hover:border-sky-400/50 hover:scale-105 transition-all"
        >
          <svg className="w-5 h-5 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
      </div>
    </div>
  );
}
