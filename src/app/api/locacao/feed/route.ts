/**
 * O FEED DOS PORTAIS — alumma.com.br/api/locacao/feed
 *
 * É esta URL que o Grupo OLX (Canal Pro) vai ler 2×/dia depois da
 * homologação: o XML VRSync com todos os imóveis ANUNCIADOS, gerado na hora
 * a partir do banco. Marcou "anunciado" no admin → entra aqui → o portal
 * publica. Marcou "alugado" → some daqui → o portal tira do ar.
 *
 * Já está pronta pra homologação — só falta a chave de serviço do Firebase
 * na variável de ambiente do Netlify (instruções em lib/firebaseAdmin.ts).
 * Sem ela, responde 503 dizendo exatamente isso.
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { gerarFeedVrsync, type ImovelLocacao } from '@/lib/locacao';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = adminDb();
  if (!db) {
    return NextResponse.json(
      { erro: 'Feed aguardando configuração: falta FIREBASE_SERVICE_ACCOUNT_B64 nas variáveis de ambiente do servidor.' },
      { status: 503 },
    );
  }
  try {
    const snap = await db.collection('locacaoImoveis').where('status', '==', 'anunciado').get();
    const imoveis = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ImovelLocacao));
    const xml = gerarFeedVrsync(imoveis, {
      nome: 'Nox Imóveis',
      email: process.env.FEED_CONTATO_EMAIL || 'contato@noximobiliaria.com.br',
      telefone: process.env.FEED_CONTATO_TELEFONE || '',
    });
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
    });
  } catch (e) {
    console.error('feed vrsync:', e);
    return NextResponse.json({ erro: 'Falha ao gerar o feed.' }, { status: 500 });
  }
}
