'use client';

import React from 'react';
import Link from 'next/link';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar ao administrador
        </Link>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center">
          <h1 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Financeiro</h1>
          <p className="text-[#6B6F76] dark:text-gray-400">Área disponível para nova implementação.</p>
        </div>
      </div>
    </div>
  );
}
