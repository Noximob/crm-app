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
      <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-8">Escolha seu plano</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 w-full max-w-6xl">
        {plans.map((plan, idx) => (
          <div
            key={plan.name}
            className={`flex flex-col items-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 transition-all duration-200 ${plan.highlight ? 'border-2 border-[#3478F6] shadow-lg scale-105' : ''}`}
          >
            <h2 className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2">{plan.name}</h2>
            <ul className="text-sm text-[#6B6F76] dark:text-gray-300 mb-6 space-y-1 list-disc list-inside">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4">{plan.price}</div>
            <button className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-[#3478F6] hover:bg-[#255FD1] transition-colors shadow-soft">
              Comprar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 