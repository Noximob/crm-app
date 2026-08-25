/**
 * O RECEPTOR DE LEADS DO GRUPO OLX — alumma.com.br/api/locacao/leads-olx
 *
 * É o endpoint que se cadastra no formulário de homologação do Grupo OLX:
 * cada interessado num anúncio (OLX/ZAP/VivaReal) chega aqui como POST JSON
 * e cai na esteira da locação, já com a temperatura avaliada pelo portal.
 *
 * Regras da documentação deles respeitadas:
 *   · responder 2xx rápido (só o código HTTP importa pra eles);
 *   · originLeadId é a chave de deduplicação (eles reenviam até 3×);
 *   · clientListingId é o NOSSO código do anúncio (LOC-001…) — casa o lead
 *     com o imóvel;
 *   · proteção por segredo na URL: ?token=<LEADS_OLX_TOKEN> (defina a
 *     variável no Netlify e informe a URL completa na homologação).
 *
 * Pronto pra homologação — falta só a chave de serviço do Firebase no
 * Netlify (lib/firebaseAdmin.ts explica).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const TEMPERATURA: Record<string, string> = { baixa: 'baixa', média: 'media', media: 'media', alta: 'alta' };

export async function POST(req: NextRequest) {
  const db = adminDb();
  if (!db) {
    return NextResponse.json({ erro: 'Endpoint aguardando configuração do servidor.' }, { status: 503 });
  }

  // segredo na URL — recomendação de segurança da própria documentação deles
  const esperado = process.env.LEADS_OLX_TOKEN;
  if (esperado && req.nextUrl.searchParams.get('token') !== esperado) {
    return NextResponse.json({ erro: 'token inválido' }, { status: 401 });
  }

  try {
    const b = (await req.json()) as Record<string, unknown>;
    const s = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : '');

    const originLeadId = s('originLeadId');
    // dedupe: o Grupo OLX reenvia em caso de falha; o mesmo lead não entra 2×
    if (originLeadId) {
      const jaTem = await db.collection('locacaoLeads').where('originLeadId', '==', originLeadId).limit(1).get();
      if (!jaTem.empty) return NextResponse.json({ ok: true, duplicado: true });
    }

    // o clientListingId é o nosso código — dele sai o imóvel e a imobiliária
    const codigo = s('clientListingId');
    let imovelId = '';
    let imobiliariaId = '';
    if (codigo) {
      const im = await db.collection('locacaoImoveis').where('codigo', '==', codigo).limit(1).get();
      if (!im.empty) { imovelId = im.docs[0].id; imobiliariaId = String(im.docs[0].data().imobiliariaId || ''); }
    }
    if (!imobiliariaId) {
      // sem casar o imóvel o lead não se perde: entra sem vínculo pra triagem manual
      const qualquer = await db.collection('locacaoImoveis').limit(1).get();
      imobiliariaId = qualquer.empty ? '' : String(qualquer.docs[0].data().imobiliariaId || '');
    }

    const telefone = [s('ddd'), s('phone')].filter(Boolean).join(' ') || s('phoneNumber');
    await db.collection('locacaoLeads').add({
      imobiliariaId, imovelId,
      nome: s('name') || 'Interessado do portal',
      telefone, email: s('email'),
      origem: 'grupo_olx',
      originLeadId,
      temperatura: TEMPERATURA[s('temperature').toLowerCase()] || '',
      mensagem: s('message'),
      etapa: 'novo', visitaEm: '', corretorNome: '',
      garantia: null, contratoId: '', perdidoMotivo: '',
      criadoEm: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('lead olx:', e);
    // 5xx faz o Grupo OLX re-tentar — é o comportamento certo quando falhamos
    return NextResponse.json({ erro: 'falha ao processar' }, { status: 500 });
  }
}
