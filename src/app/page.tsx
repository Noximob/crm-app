'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlummaLogoFullInline } from '@/components/AlummaLogo';

const WHATSAPP_LINK = 'https://wa.me/5547999999999';
const WHATSAPP_DISPLAY = '(47) 99999-9999';
const INSTAGRAM_HANDLE = '@alumma.crm';
const CONTACT_EMAIL = 'contato@alumma.com.br';

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
          <nav className="flex items-center gap-6">
            <Link href="#solucoes" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Soluções</Link>
            <Link href="#diferencial" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Diferencial</Link>
            <Link href="#contato" className="text-sm font-medium text-text-secondary hover:text-orange-400 transition-colors">Contato</Link>
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
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link
              href={platformHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_24px_rgba(255,140,0,0.35)] hover:shadow-[0_0_32px_rgba(255,140,0,0.45)]"
            >
              Acessar a plataforma
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-emerald-400/60 text-emerald-300 font-bold text-lg hover:bg-emerald-500/10 transition-all"
            >
              Falar no WhatsApp
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z" />
              </svg>
            </a>
          </div>
          <p className="mt-6 text-sm text-text-secondary animate-fade-in" style={{ animationDelay: '0.35s' }}>
            Atendimento também pelo WhatsApp: <span className="font-semibold text-white">{WHATSAPP_DISPLAY}</span>
          </p>
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
          <div className="card-glow rounded-3xl p-12 relative overflow-hidden border-orange-500/30">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Pronto para vender mais?</h2>
            <p className="text-text-secondary mb-8">
              Acesse a plataforma ou fale com a gente pelo WhatsApp para entender se faz sentido para sua operação.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={platformHref} className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:from-amber-600 hover:to-orange-700 transition-all shadow-[0_0_20px_rgba(255,140,0,0.3)]">
                Acessar plataforma
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl border-2 border-emerald-400/60 text-emerald-300 font-bold hover:bg-emerald-500/10 transition-all"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-16 px-4 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[2fr,3fr] items-start">
          <div>
            <h2 className="text-2xl font-bold mb-3">Vamos conversar sobre a sua imobiliária?</h2>
            <p className="text-text-secondary mb-4">
              Conte para a gente como está hoje a operação e para onde você quer levar o time. A partir daí, montamos
              juntos o caminho dentro da Alumma.
            </p>
            <p className="text-sm text-text-secondary">
              Atendemos por WhatsApp, e-mail e estamos sempre presentes no Instagram compartilhando bastidores e
              aprendizados.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card-glow rounded-2xl p-4 flex flex-col gap-2 hover:border-pink-500/40 transition-colors"
            >
              <span className="text-xs font-semibold text-pink-400 uppercase tracking-wide">Instagram</span>
              <span className="text-sm font-bold text-white">{INSTAGRAM_HANDLE}</span>
              <span className="text-xs text-text-secondary">Conteúdo para corretores e líderes de imobiliárias.</span>
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="card-glow rounded-2xl p-4 flex flex-col gap-2 hover:border-sky-400/40 transition-colors"
            >
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wide">E-mail</span>
              <span className="text-sm font-bold text-white break-all">{CONTACT_EMAIL}</span>
              <span className="text-xs text-text-secondary">Para propostas, dúvidas e parcerias.</span>
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="card-glow rounded-2xl p-4 flex flex-col gap-2 hover:border-emerald-400/40 transition-colors"
            >
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">WhatsApp</span>
              <span className="text-sm font-bold text-white">{WHATSAPP_DISPLAY}</span>
              <span className="text-xs text-text-secondary">Atendimento rápido para imobiliárias e corretores.</span>
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

      {/* Botão flutuante de WhatsApp */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a Alumma no WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.6)] hover:scale-105 transition-transform"
      >
        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.2 6.26 2.2 11.58c0 1.9.56 3.67 1.54 5.17L2 22l5.44-1.7a9.95 9.95 0 0 0 4.6 1.15h.01c5.46 0 9.84-4.26 9.84-9.58C21.9 6.26 17.5 2 12.04 2Zm5.8 13.38c-.24.68-1.2 1.29-1.96 1.46-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.22-4.98-4.42-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.29.59-.36.79-.36h.57c.18 0 .43-.07.67.5.24.58.82 2 0 .43-.2.48-.41.42-.6.71-.18.29-.32.43-.48.72-.15.29-.31.61-.13.9.18.29.8 1.3 1.72 2.1 1.18 1.06 2.18 1.4 2.52 1.56.34.15.54.13.74-.08.2-.22.85-.95 1.08-1.28.22-.32.45-.27.76-.16.31.11 1.97.93 2.31 1.1.34.18.56.27.64.42.08.15.08.88-.16 1.55Z" />
        </svg>
      </a>
    </div>
  );
}
