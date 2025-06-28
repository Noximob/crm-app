'use client';

import React from 'react';

export default function DWVPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-4 text-left">DWV</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-4 text-left text-base">Utilize o sistema DWV sem sair do CRM.</p>
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-[#E8E9F1] dark:border-[#23283A] shadow-soft bg-white dark:bg-[#23283A]">
          <iframe
            src="https://app.dwvapp.com.br/home"
            title="DWV"
            className="w-full h-full border-0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
} 