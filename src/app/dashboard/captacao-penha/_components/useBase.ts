'use client';

/**
 * A BASE — o arquivo public/captacao-penha/dados.json, lido uma vez e
 * preparado (lib/captacaoPenha.ts) pra tela.
 *
 * Fica guardada enquanto o sistema está aberto: sair da aba e voltar não
 * baixa nem prepara de novo. Passados 10 minutos, a próxima entrada pergunta
 * ao servidor se o arquivo mudou (uma varredura nova foi publicada) — se não
 * mudou, o navegador nem baixa; se mudou, a lista troca sozinha.
 */
import { useEffect, useState } from 'react';
import { CAPTACAO_DADOS_URL, preparar, type BaseCaptacao, type DadosCaptacao } from '@/lib/captacaoPenha';

const VALIDADE = 10 * 60 * 1000;
let guardada: { base: BaseCaptacao; etag: string | null; em: number } | null = null;
let emCurso: Promise<BaseCaptacao> | null = null;

async function buscar(): Promise<BaseCaptacao> {
  // no-cache = sempre confere com o servidor; arquivo igual volta do cache do navegador
  const r = await fetch(CAPTACAO_DADOS_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error('captação: HTTP ' + r.status);
  const etag = r.headers.get('etag');
  if (guardada && etag && etag === guardada.etag) {
    guardada.em = Date.now();
    return guardada.base;
  }
  const dados = (await r.json()) as DadosCaptacao;
  if (!dados || !dados.meta || !Array.isArray(dados.items)) throw new Error('captação: arquivo fora do formato');
  const base = preparar(dados);
  guardada = { base, etag, em: Date.now() };
  return base;
}

export function useBase(): { base: BaseCaptacao | null; erro: boolean; tentarDeNovo: () => void } {
  const [base, setBase] = useState<BaseCaptacao | null>(guardada ? guardada.base : null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (guardada && tentativa === 0 && Date.now() - guardada.em < VALIDADE) return;
    let vivo = true;
    setErro(false);
    if (!emCurso) emCurso = buscar().finally(() => { emCurso = null; });
    emCurso.then(
      (b) => { if (vivo) setBase(b); },
      (e) => { console.error(e); if (vivo && !guardada) setErro(true); },   // com base antiga na mão, segue com ela
    );
    return () => { vivo = false; };
  }, [tentativa]);

  return { base, erro, tentarDeNovo: () => setTentativa((t) => t + 1) };
}
