'use client';

/**
 * 💬 A CAIXA DE ENTRADA — o que os clientes mandaram pra administração.
 *
 * Duas fontes, um lugar só:
 *
 *   🔧 MANUTENÇÃO   o chamado do inquilino (a torneira pinga). Tem obra por
 *                   trás, então tem esteira: aberto → orçando → aguardando o
 *                   dono aprovar → executando → resolvido. UM botão dourado
 *                   move pro próximo passo; orçamento e quem paga ficam na
 *                   própria linha.
 *
 *   💬 RECADO       a mensagem do dono ou do inquilino (vou viajar, posso
 *                   pagar dia 10?). Não tem esteira: precisa ser LIDA e
 *                   RESPONDIDA — responder é no WhatsApp, e aqui fica o
 *                   registro de como foi tratada.
 *
 * Hoje os recados entram pelos botões ⚡ (o portal ainda não tem login);
 * quando o portal logar, eles caem aqui sozinhos — a tela já está pronta.
 */
import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import {
  STATUS_CHAMADO, PROXIMO_STATUS_CHAMADO, hojeYmd, fmtData, fmtValor, linkWhats,
  type Chamado, type MensagemCliente, type StatusChamado,
} from '@/lib/locacao';
import { useDadosLocacao } from '../dados';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao, AbasDaArea, num } from '../ui';

type Filtro = 'pendentes' | 'manutencao' | 'recados' | 'resolvidas';

export default function PaginaMensagens() {
  const {
    imobiliariaId, isEspelhoDemo, imoveis, locacoes, chamados, mensagens,
    carregando, recarregar, abas,
  } = useDadosLocacao();

  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [orcando, setOrcando] = useState<string | null>(null);
  const [vOrcamento, setVOrcamento] = useState('');
  const [vQuemPaga, setVQuemPaga] = useState<'dono' | 'inquilino'>('dono');
  const [tratando, setTratando] = useState<string | null>(null);
  const [vResposta, setVResposta] = useState('');

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const locacaoDe = (id: string) => locacoes.find((l) => l.id === id);
  const imovelDe = (id: string) => imoveis.find((i) => i.id === id);

  // ——— as ações dos chamados ———

  const avancarChamado = async (c: Chamado, extra: Partial<Chamado> = {}) => {
    if (guarda()) return;
    const prox = PROXIMO_STATUS_CHAMADO[c.status];
    if (!prox) return;
    await updateDoc(doc(db, 'locacaoChamados', c.id), { status: prox.para, ...extra, atualizadoEm: serverTimestamp() });
    showToast(prox.para === 'resolvido' ? '🔧 Chamado concluído.' : `Chamado agora está: ${STATUS_CHAMADO[prox.para].rotulo}.`, 'success');
    setOrcando(null); setVOrcamento('');
    recarregar();
  };

  const tratarMensagem = async (m: MensagemCliente) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoMensagens', m.id), {
      tratadaEm: hojeYmd(), resposta: vResposta.trim(), atualizadoEm: serverTimestamp(),
    });
    setTratando(null); setVResposta('');
    showToast('Recado tratado.', 'success');
    recarregar();
  };

  // ——— os ⚡ que fazem o papel do portal, enquanto não há login ———

  const simularChamado = async () => {
    if (guarda() || !imobiliariaId) return;
    const ativas = locacoes.filter((l) => l.etapa === 'ativa');
    if (!ativas.length) { showToast('Nenhuma locação ativa — chamado vem de quem já mora.', 'error'); return; }
    const l = ativas[Math.floor(Math.random() * ativas.length)];
    const problemas = [
      'A torneira da cozinha está pingando e o registro não fecha direito.',
      'O chuveiro parou de esquentar desde ontem.',
      'A fechadura da porta da frente está travando — quase fiquei sem entrar.',
      'Apareceu uma infiltração no teto do quarto depois da chuva.',
    ];
    await addDoc(collection(db, 'locacaoChamados'), {
      imobiliariaId, locacaoId: l.id, imovelId: l.imovelId,
      origem: 'inquilino', status: 'aberto', orcamento: null, quemPaga: '', resposta: '',
      descricao: problemas[Math.floor(Math.random() * problemas.length)],
      simulada: true, criadoEm: serverTimestamp(),
    });
    showToast(`⚡ ${l.nome} abriu um chamado de manutenção pelo portal.`, 'success');
    recarregar();
  };

  const simularRecado = async (de: 'inquilino' | 'dono') => {
    if (guarda() || !imobiliariaId) return;
    if (de === 'inquilino') {
      const ativas = locacoes.filter((l) => l.etapa === 'ativa');
      if (!ativas.length) { showToast('Nenhuma locação ativa.', 'error'); return; }
      const l = ativas[Math.floor(Math.random() * ativas.length)];
      const textos = [
        'Esse mês o pagamento vai atrasar uns 3 dias, tem problema? Consigo pagar dia 8.',
        'Posso instalar um ar-condicionado no quarto? O eletricista é por minha conta.',
        'Vou viajar em janeiro o mês inteiro — deixo a chave com alguém?',
      ];
      await addDoc(collection(db, 'locacaoMensagens'), {
        imobiliariaId, de: 'inquilino', nome: l.nome, telefone: l.telefone,
        locacaoId: l.id, imovelId: l.imovelId,
        texto: textos[Math.floor(Math.random() * textos.length)],
        tratadaEm: '', resposta: '', simulada: true, criadoEm: serverTimestamp(),
      });
      showToast(`⚡ Recado de ${l.nome} (inquilino) chegou pelo portal.`, 'success');
    } else {
      const comDono = imoveis.filter((i) => i.donoNome.trim());
      if (!comDono.length) { showToast('Nenhum imóvel com proprietário cadastrado.', 'error'); return; }
      const i = comDono[Math.floor(Math.random() * comDono.length)];
      const textos = [
        'Quando cai o repasse deste mês? Preciso da data pra me organizar.',
        'Estou pensando em vender o imóvel ano que vem — como fica o contrato?',
        'Podem me mandar o informe de rendimentos pro meu contador?',
      ];
      await addDoc(collection(db, 'locacaoMensagens'), {
        imobiliariaId, de: 'dono', nome: i.donoNome, telefone: i.donoTelefone,
        locacaoId: '', imovelId: i.id,
        texto: textos[Math.floor(Math.random() * textos.length)],
        tratadaEm: '', resposta: '', simulada: true, criadoEm: serverTimestamp(),
      });
      showToast(`⚡ Recado de ${i.donoNome} (proprietário) chegou pelo portal.`, 'success');
    }
    recarregar();
  };

  // ——— a lista unificada, mais antigo primeiro (fila de atendimento) ———

  type Item =
    | { tipo: 'chamado'; id: string; pendente: boolean; c: Chamado }
    | { tipo: 'recado'; id: string; pendente: boolean; m: MensagemCliente };

  const itens: Item[] = [
    ...chamados.map((c): Item => ({ tipo: 'chamado', id: c.id, pendente: c.status !== 'resolvido', c })),
    ...mensagens.map((m): Item => ({ tipo: 'recado', id: m.id, pendente: !m.tratadaEm, m })),
  ].filter((x) => {
    if (filtro === 'pendentes') return x.pendente;
    if (filtro === 'manutencao') return x.tipo === 'chamado';
    if (filtro === 'recados') return x.tipo === 'recado';
    return !x.pendente;
  }).sort((a, b) => Number(b.pendente) - Number(a.pendente));

  const pendentes = chamados.filter((c) => c.status !== 'resolvido').length + mensagens.filter((m) => !m.tratadaEm).length;

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-5xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Mensagens</h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[62ch]">
              O que donos e inquilinos mandaram pela administração:
              {' '}<b className="text-white/85">manutenção</b> anda numa esteira,
              {' '}<b className="text-white/85">recado</b> se responde e registra.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={simularChamado} className={btnSimula}>⚡ Chamado de manutenção</button>
            <button onClick={() => simularRecado('inquilino')} className={btnSimula}>⚡ Recado do inquilino</button>
            <button onClick={() => simularRecado('dono')} className={btnSimula}>⚡ Recado do dono</button>
          </div>
        </div>

        <AbasDaArea ativa="mensagens" crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes} mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* os filtros */}
        <div className="flex flex-wrap gap-1.5">
          {([
            ['pendentes', `📥 Pendentes (${pendentes})`],
            ['manutencao', `🔧 Manutenção (${chamados.length})`],
            ['recados', `💬 Recados (${mensagens.length})`],
            ['resolvidas', '✓ Resolvidas'],
          ] as const).map(([k, rot]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold border transition-colors ${
                filtro === k ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]'
                  : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'}`}>
              {rot}
            </button>
          ))}
        </div>

        {/* a fila */}
        {itens.map((item) => {
          if (item.tipo === 'chamado') {
            const c = item.c;
            const l = locacaoDe(c.locacaoId);
            const im = imovelDe(c.imovelId);
            const st = STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto;
            const prox = PROXIMO_STATUS_CHAMADO[c.status];
            const zap = l ? linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! Sobre o seu chamado de manutenção:`) : '';
            const precisaOrcamento = c.status === 'orcando';
            return (
              <div key={c.id} className={`al-card relative overflow-hidden ${item.pendente ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
                {item.pendente && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
                <div className="p-4">
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <p className="text-[13.5px] font-bold text-white">
                        🔧 Manutenção — {l?.nome || 'inquilino'}
                        <span className={`ml-2 text-[10.5px] font-extrabold uppercase ${st.cor}`}>{st.rotulo}</span>
                        {(c as { simulada?: boolean }).simulada && <span className="ml-2"><SeloSimulacao /></span>}
                      </p>
                      <p className="text-[11.5px] text-text-secondary mt-0.5">
                        {im ? `${im.codigo} · ${im.titulo}` : 'imóvel não encontrado'}
                      </p>
                      <p className="text-[12.5px] text-white/85 mt-1.5">&ldquo;{c.descricao}&rdquo;</p>
                      {(c.orcamento || c.quemPaga) && (
                        <p className="text-[11.5px] text-text-secondary mt-1">
                          {c.orcamento ? <>Orçamento: <b className="text-[#FFE9A6]">{fmtValor(c.orcamento)}</b></> : null}
                          {c.quemPaga && <> · quem paga: <b className="text-white/85">{c.quemPaga === 'dono' ? 'o proprietário' : 'o inquilino'}</b></>}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-wrap gap-1.5">
                      {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-2 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 responder</a>}
                      {prox && !precisaOrcamento && (
                        <button onClick={() => avancarChamado(c)} className={btnOuro}>{prox.rotulo}</button>
                      )}
                      {prox && precisaOrcamento && (orcando === c.id ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <input className={inputCls + ' !w-24'} inputMode="decimal" placeholder="R$" value={vOrcamento} onChange={(e) => setVOrcamento(e.target.value)} />
                          <select className={inputCls + ' !w-auto'} value={vQuemPaga} onChange={(e) => setVQuemPaga(e.target.value as 'dono' | 'inquilino')}>
                            <option value="dono">dono paga</option>
                            <option value="inquilino">inquilino paga</option>
                          </select>
                          <button onClick={() => avancarChamado(c, { orcamento: num(vOrcamento), quemPaga: vQuemPaga })} className={btnOuro}>{prox.rotulo}</button>
                          <button onClick={() => setOrcando(null)} className={btnGhost}>×</button>
                        </span>
                      ) : (
                        <button onClick={() => { setOrcando(c.id); setVOrcamento(c.orcamento ? String(c.orcamento) : ''); }} className={btnOuro}>{prox.rotulo}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const m = item.m;
          const im = imovelDe(m.imovelId);
          const zap = linkWhats(m.telefone, `Olá ${(m.nome || '').split(' ')[0]}! Recebemos o seu recado:`);
          return (
            <div key={m.id} className={`al-card relative overflow-hidden ${item.pendente ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
              {item.pendente && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
              <div className="p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <p className="text-[13.5px] font-bold text-white">
                      {m.de === 'dono' ? '🏠' : '🔑'} Recado — {m.nome}
                      <span className="ml-2 text-[10.5px] font-extrabold uppercase text-text-secondary">
                        {m.de === 'dono' ? 'proprietário' : 'inquilino'}
                      </span>
                      {m.simulada && <span className="ml-2"><SeloSimulacao /></span>}
                    </p>
                    <p className="text-[11.5px] text-text-secondary mt-0.5">
                      {im ? `${im.codigo} · ${im.titulo}` : ''}
                    </p>
                    <p className="text-[12.5px] text-white/85 mt-1.5">&ldquo;{m.texto}&rdquo;</p>
                    {m.tratadaEm && (
                      <p className="text-[11.5px] text-emerald-300 mt-1">
                        ✓ Tratada em {fmtData(m.tratadaEm)}{m.resposta ? ` — ${m.resposta}` : ''}
                      </p>
                    )}
                  </div>
                  {!m.tratadaEm && (
                    <div className="shrink-0 flex flex-wrap gap-1.5">
                      {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-2 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 responder no WhatsApp</a>}
                      {tratando === m.id ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <input className={inputCls + ' !w-56'} placeholder="como foi resolvido (opcional)" value={vResposta} onChange={(e) => setVResposta(e.target.value)} />
                          <button onClick={() => tratarMensagem(m)} className={btnOuro}>✓ tratada</button>
                          <button onClick={() => setTratando(null)} className={btnGhost}>×</button>
                        </span>
                      ) : (
                        <button onClick={() => { setTratando(m.id); setVResposta(''); }} className={btnOuro}>✓ Marcar como tratada</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {itens.length === 0 && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">📭</p>
            <p className="text-[14px] font-bold text-white">
              {filtro === 'pendentes' ? 'Caixa limpa — nada esperando resposta.' : 'Nada por aqui.'}
            </p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
              Quando o portal do cliente ganhar login, os chamados e recados dos donos e
              inquilinos caem aqui sozinhos. Por enquanto, use os botões ⚡ pra ver a fila rodando.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
