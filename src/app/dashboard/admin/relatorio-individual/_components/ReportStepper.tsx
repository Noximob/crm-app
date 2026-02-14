'use client';

import React from 'react';

export interface ReportStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  steps: { label: string; short: string }[];
}

export default function ReportStepper({ currentStep, onStepChange, steps }: ReportStepperProps) {
  return (
    <nav className="flex items-center justify-center gap-1 sm:gap-4 mb-6" aria-label="Páginas do relatório">
      {steps.map((step, index) => {
        const isActive = currentStep === index;
        const isPast = currentStep > index;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onStepChange(index)}
            className={`
              flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              ${isActive
                ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/40 shadow-soft'
                : isPast
                  ? 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-white/5'
              }
            `}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={`
                flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                ${isActive ? 'bg-[#D4A017] text-black' : isPast ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/10 text-gray-500'}
              `}
            >
              {isPast ? '✓' : index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{step.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
