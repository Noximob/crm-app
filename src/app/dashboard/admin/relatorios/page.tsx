"use client";

/**
 * Relatórios — EM CONSTRUÇÃO.
 * A versão anterior foi aposentada (recuperável no git); os relatórios serão
 * refeitos do zero com outra abordagem.
 */
export default function RelatoriosPage() {
  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <span className="gx-tag"><span>Área do administrador</span></span>
      <div className="al-card relative overflow-hidden p-10 mt-3 text-center">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <p className="text-[44px] leading-none mb-3">🚧</p>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.12em]">Relatórios em construção</h1>
        <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
          Estamos redesenhando os relatórios do zero pra ficarem do jeito certo.
          Enquanto isso, o placar de Meets &amp; Visitas e o CRM do corretor seguem valendo.
        </p>
      </div>
    </div>
  );
}
