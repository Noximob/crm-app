import { DocumentData } from 'firebase/firestore';

export interface Lead extends DocumentData {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    etapa: string;
    anotacoes?: string;
    [key: string]: any;
}

// Podemos adicionar outras interfaces aqui no futuro
// export interface User { ... }
// export interface Task { ... } 