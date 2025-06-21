import { DocumentData } from 'firebase/firestore';

export interface Lead extends DocumentData {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    etapa: string;
    anotacoes?: string;
    status?: string; // Tarefa em Atraso, Tarefa do Dia, etc.
    [key: string]: any;
}

// Podemos adicionar outras interfaces aqui no futuro
// export interface User { ... }
// export interface Task { ... } 