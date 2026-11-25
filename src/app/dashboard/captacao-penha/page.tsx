'use client';

/**
 * CAPTAÇÃO PENHA — todos os imóveis prontos e terrenos à venda em Penha/SC,
 * juntados dos portais, dos sites das imobiliárias e do DWV, pra equipe achar
 * o que vale captar: anúncio direto de particular, imóvel sem exclusividade,
 * quem baixou o preço, quem está há muito tempo anunciado.
 *
 * A base é um arquivo (public/captacao-penha/dados.json) gerado pelo motor em
 * Desktop/Captação Penha — lib/captacaoPenha.ts explica como atualizar. A tela
 * só lê; o que cada pessoa exclui ou anota fica na conta dela.
 */
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';
import Painel from './_components/Painel';
import { useBase } from './_components/useBase';
import { useMarcas } from './_components/useMarcas';

export default function CaptacaoPenhaPage() {
  const { currentUser, isEspelhoDemo } = useAuth();
  const { base, erro, tentarDeNovo } = useBase();
  const marcas = useMarcas(currentUser?.uid, isEspelhoDemo);

  if (erro) {
    return (
      <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
        <p className="text-[14px] text-text-secondary">Não consegui carregar a lista de imóveis. Confira a conexão e tente de novo.</p>
        <button type="button" onClick={tentarDeNovo}
          className="mt-4 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] px-5 py-2.5 text-[13.5px] font-bold text-white hover:brightness-110 active:scale-[0.98]">
          Tentar de novo
        </button>
      </div>
    );
  }
  // espera a base e as marcas da pessoa: assim um anúncio que ela já excluiu não pisca na tela antes de sumir
  if (!base || !marcas.pronto) return <LoadingState label="Carregando os imóveis…" className="min-h-[50vh]" />;
  return <Painel base={base} marcas={marcas} />;
}
