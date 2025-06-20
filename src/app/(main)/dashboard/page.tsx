'use client';

import React from 'react';
import Link from 'next/link';

const DashboardPage = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">Por onde começamos?</h1>
      </div>

      <Link href="/crm"
        className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white bg-primary-500 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-800"
      >
        <span className="absolute left-0 top-0 w-full h-full bg-gradient-to-r from-primary-600 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        <span className="relative transition-transform duration-300 ease-in-out group-hover:scale-105">
          Acessar CRM
        </span>
      </Link>

    </div>
  );
};

export default DashboardPage; 