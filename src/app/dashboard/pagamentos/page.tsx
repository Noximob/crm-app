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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Escolha seu plano</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Tenha acesso ao melhor do CRM imobiliário, automações e suporte de acordo com a sua necessidade.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative flex flex-col items-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 transition-all duration-200 ${plan.highlight ? 'border-2 border-[#3478F6] shadow-lg scale-105 z-10' : ''}`}
            >
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#3478F6] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">Recomendado</span>
              )}
              <h2 className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2">{plan.name}</h2>
              <ul className="text-sm text-[#6B6F76] dark:text-gray-300 mb-6 space-y-1 list-disc list-inside text-left w-full pl-2">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4">{plan.price}</div>
              <button className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors shadow-soft text-base ${plan.highlight ? 'bg-[#3478F6] text-white hover:bg-[#255FD1]' : 'bg-[#E8E9F1] text-[#3478F6] hover:bg-[#A3C8F7]/40'}`}
              >
                Comprar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 