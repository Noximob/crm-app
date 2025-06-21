import { DocumentData } from 'firebase/firestore';

export interface Lead extends DocumentData {
    id: string;
    nome: string;
    telefone: string;
    etapa: string;
    status: string;
}

// Podemos adicionar outras interfaces aqui no futuro
// export interface User { ... }
// export interface Task { ... } 