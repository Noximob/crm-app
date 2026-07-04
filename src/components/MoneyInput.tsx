'use client';

import React from 'react';

/** Formata número (em reais) como 1.234,56 */
export function formatBRL(n: number): string {
  return (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de moeda com máscara: a pessoa digita os números e o valor é formatado
 * da direita pra esquerda em centavos — ex.: 50000 → "500,00", 500000 → "5.000,00".
 * `value` é o número em reais; `onChange` devolve o número.
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  prefix = true,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: boolean;
}) {
  const display = value ? formatBRL(value) : '';
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits ? parseInt(digits, 10) / 100 : 0);
  };
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9aa0a6] pointer-events-none">R$</span>}
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handle}
        placeholder={placeholder}
        className={`${className} ${prefix ? 'pl-9' : ''} tabular-nums`}
      />
    </div>
  );
}
