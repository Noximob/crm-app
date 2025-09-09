'use client';

import React from 'react';

export default function BrelloPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] to-[#E8E9F1] dark:from-[#181C23] dark:to-[#23283A]">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-4">
              Brello
            </h3>
            <p className="text-lg text-[#6B6F76] dark:text-gray-300 mb-8 max-w-md mx-auto">
              Página em reformulação. Em breve teremos novidades!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}