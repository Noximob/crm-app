import { DocumentData } from 'firebase/firestore';
import type { TarefaPendente } from '@/lib/leadTasks';

export interface Lead extends DocumentData {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    etapa: string;
    anotacoes?: string;
    status?: string; // Tarefa em Atraso, Tarefa do Dia, etc.
    tarefasPendentes?: TarefaPendente[]; // espelho das tarefas pendentes (subcoleção 'tarefas')
    /** de qual carteira é: 'imobiliaria' (a casa entrega) | 'rede' (o corretor traz). Sem campo → pela origem. */
    carteira?: string;
    /** a opção de origem escolhida ao cadastrar (Propaganda, Ligação, Networking, Plantão…) */
    origemTipo?: string;
    /** guardado na gaveta de Interesse futuro do corretor (até 50) */
    guardado?: boolean;
    [key: string]: any;
}

// Podemos adicionar outras interfaces aqui no futuro
// export interface User { ... }
// export interface Task { ... } 