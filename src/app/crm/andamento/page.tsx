import CrmHeader from '../_components/CrmHeader';

export default function AndamentoPage() {
    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-3 mt-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visualização de Andamento (Kanban)</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Em breve, você verá seus leads organizados em colunas por etapa do funil.</p>
                </div>
            </main>
        </div>
    );
} 