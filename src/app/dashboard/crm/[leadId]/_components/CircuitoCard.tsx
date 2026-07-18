'use client';

/**
 * Circuito do lead — resumo compacto na página.
 * O atendimento de verdade acontece nos pop-ups (AtendimentoOverlay);
 * este card mostra onde o lead está e o botão pra atender.
 */
import React from 'react';
import {
  ETAPAS_CIRCUITO, ETAPA_BOLSAO, ETAPA_FECHADO, ETAPA_DESCARTADO, CORES_CIRCUITO,
} from '@/lib/circuito';
import { toJsDate } from '@/lib/leadTasks';

interface CircuitoCardProps {
  etapa: string; // normalizada
  tentativas: number;
  desde: any;
  descartadoMotivo?: string;
  vendaValor?: string;
  pendente: boolean;       // há pergunta em aberto
  pendenteFechado: boolean; // corretor fechou o pop-up no ✕ sem responder
  readOnly: boolean;
  onAtender: () => void;
}

const p2 = (n: number) => String(n).padStart(2, '0');

function Trilho({ etapa }: { etapa: string }) {
  const ativas = ETAPAS_CIRCUITO.slice(0, 5) as unknown as string[];
  const idx = ativas.indexOf(etapa);
  const especial =
    etapa === ETAPA_BOLSAO ? { txt: '🧊 Bolsão', cls: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]' } :
    etapa === ETAPA_FECHADO ? { txt: '🏆 Fechado', cls: 'bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]' } :
    etapa === ETAPA_DESCARTADO ? { txt: 'Descartado', cls: 'bg-white/[0.05] border-white/15 text-text-secondary' } :
    null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ativas.map((e, i) => {
        const cor = CORES_CIRCUITO[i];
        const atual = i === idx;
        const passou = idx >= 0 && i < idx;
        return (
          <React.Fragment key={e}>
            {i > 0 && <span className={`h-px w-2.5 sm:w-4 ${passou || atual ? 'bg-white/40' : 'bg-white/10'}`} />}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold uppercase tracking-wider transition-all ${atual ? 'scale-105' : ''}`}
              style={{
                borderColor: atual ? cor : 'rgba(255,255,255,0.1)',
                background: atual ? `${cor}1f` : passou ? `${cor}10` : 'rgba(255,255,255,0.03)',
                color: atual || passou ? cor : 'rgba(255,255,255,0.35)',
                boxShadow: atual ? `0 0 14px -2px ${cor}80` : 'none',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: atual || passou ? cor : 'rgba(255,255,255,0.2)' }} />
              {e}
            </span>
          </React.Fragment>
        );
      })}
      {especial && (
        <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold uppercase tracking-wider ${especial.cls}`}>
          {especial.txt}
        </span>
      )}
    </div>
  );
}

export default function CircuitoCard({ etapa, tentativas, desde, descartadoMotivo, vendaValor, pendente, pendenteFechado, readOnly, onAtender }: CircuitoCardProps) {
  const d = toJsDate(desde);
  const desdeTxt = d ? `desde ${p2(d.getDate())}/${p2(d.getMonth() + 1)}` : '';

  const statusLinha = (() => {
    if (etapa === ETAPA_FECHADO) return `🏆 Vendido!${vendaValor && vendaValor !== '—' ? ` R$ ${vendaValor}` : ''} ${desdeTxt}`;
    if (etapa === ETAPA_DESCARTADO) return `Descartado${descartadoMotivo ? ` — ${descartadoMotivo}` : ''}`;
    if (etapa === ETAPA_BOLSAO) return `🧊 Estacionado no bolsão ${desdeTxt} — reative quando fizer sentido.`;
    if (pendente) return '🔔 Pergunta do circuito em aberto — o pop-up abre sozinho.';
    return `Em ${etapa} ${desdeTxt} — o sistema te chama na hora certa.`;
  })();

  // O único botão aqui é resolver pendência ou reativar lead parado:
  // o atendimento normal acontece sozinho, em pop-up.
  const acaoManual =
    !readOnly && pendenteFechado ? 'Resolver agora →' :
    !readOnly && (etapa === ETAPA_BOLSAO || etapa === ETAPA_DESCARTADO) ? '🔄 Reativar lead' :
    null;

  return (
    <div className={`al-card relative overflow-hidden p-5 ${pendenteFechado ? 'border-amber-500/40' : ''}`}>
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="gx-tag">Circuito do lead</span>
        {tentativas > 0 && etapa !== ETAPA_FECHADO && etapa !== ETAPA_DESCARTADO && (
          <span className="text-[10px] font-bold text-amber-200/80">📵 {tentativas} tentativa{tentativas > 1 ? 's' : ''} sem resposta</span>
        )}
      </div>
      <div className="mb-3">
        <Trilho etapa={etapa} />
      </div>

      {pendenteFechado && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-200 font-medium">⚠️ Lead pendente de encaminhamento — o pop-up foi fechado sem resposta.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-text-secondary">{statusLinha}</p>
        {acaoManual && (
          <button
            onClick={onAtender}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] ${
              pendenteFechado
                ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] animate-pulse'
                : 'bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20'
            }`}
          >
            {acaoManual}
          </button>
        )}
      </div>
    </div>
  );
}
