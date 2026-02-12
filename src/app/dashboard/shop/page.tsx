'use client';

import React from 'react';
import Link from 'next/link';

export default function ShopPage() {
  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
          <span className="text-3xl">🪙</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Shop</h1>
        <p className="text-gray-400 mb-6">
          Aqui você poderá gastar suas moedas. Em breve.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
