/** Etapas do circuito do lead (ordem do quadro). Fonte única: src/lib/circuito.ts. */
export const PIPELINE_STAGES = [
    'Entrada', 'Follow-up', 'Meet', 'Visita', 'Negociação'
];

/** Modo demonstração (Espelho): login/senha únicos; não usa Firestore. */
export const ESPELHO_DEMO_UID = 'espelho-demo-uid';
export const ESPELHO_LOGIN = 'Espelho';
export const ESPELHO_PASSWORD = 'Espelho';
export const ESPELHO_STORAGE_KEY = 'espelho_demo'; 