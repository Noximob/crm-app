import React from 'react';

const plans = [
  {
    name: 'Plano Starter',
    price: 'R$ 39/mês',
    features: ['Até 2 usuários', 'Funções básicas', 'Suporte por e-mail'],
    highlight: false,
  },
  {
    name: 'Plano Pro',
    price: 'R$ 89/mês',
    features: ['Até 10 usuários', 'Funções avançadas', 'Suporte prioritário'],
    highlight: true,
  },
  {
    name: 'Plano Business',
    price: 'R$ 199/mês',
    features: ['Usuários ilimitados', 'Automação completa', 'Suporte dedicado'],
    highlight: false,
  },
  {
    name: 'Plano Enterprise',
    price: 'Sob consulta',
    features: ['Soluções customizadas', 'Integrações avançadas', 'Gestor dedicado'],
    highlight: false,
  },
];

export default function PagamentosPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] py-10">
      <h1 className="text-4xl font-bold text-red-600 mb-8">Página de Pagamentos funcionando!</h1>
      <p className="text-lg text-[#2E2F38] dark:text-white">Se você está vendo esta mensagem, a rota está correta e o deploy funcionou.</p>
    </div>
  );
} 