/**
 * MEET COM MAIS DE UM CORRETOR — o convite e o lembrete.
 *
 * Duas funções, as duas usando o mesmo `enviarPush` do lead de anúncio (o
 * aviso chega igual no celular, com o app fechado):
 *
 *  1. notificarConviteMeet — nasceu um doc em `convitesMeet` → avisa quem foi
 *     chamado. O pop-up dentro do app é o ConviteMeetCard, que escuta a mesma
 *     coleção; o push é pra quem está com o app fechado.
 *  2. lembreteMeet1h — de 5 em 5 minutos varre as tarefas de Meet que começam
 *     daqui a ~1 hora e avisa todo mundo que está no meet: o dono do lead e
 *     quem aceitou o convite (`participantesIds`).
 *
 * Tarefa antiga (criada antes dos convites) não tem `userId` — nesse caso o
 * dono vem do lead pai, então o lembrete também vale pros meets que já existiam.
 */
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {enviarPush} from "./distribuicaoAds";

const db = () => admin.firestore();

const FUSO = "America/Sao_Paulo";
const MINUTO = 60 * 1000;

/** "sex., 12/07, 15:00" — no fuso de casa, não no do servidor. */
function quandoTexto(valor: unknown): string {
    const ts = valor as admin.firestore.Timestamp | undefined;
    if (!ts || typeof ts.toDate !== "function") return "";
    return ts.toDate().toLocaleString("pt-BR", {
        timeZone: FUSO,
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ---------------------------------------------------------------------------
// 1) Convite criado → aviso no celular de quem foi chamado
// ---------------------------------------------------------------------------
export const notificarConviteMeet = onDocumentCreated(
    "convitesMeet/{conviteId}",
    async (event) => {
        const dados = event.data?.data();
        if (!dados || dados.status !== "pendente") return;

        const para = String(dados.para || "");
        if (!para) return;

        const quem = String(dados.deNome || "Um corretor");
        const cliente = String(dados.leadNome || "um cliente");
        const quando = quandoTexto(dados.quando);

        await enviarPush(
            [para],
            "📅 Convite de meet",
            `${quem} te chamou pro meet com ${cliente}${quando ? ` · ${quando}` : ""}`,
            {url: "/dashboard", conviteId: event.params.conviteId},
        );
    },
);

// ---------------------------------------------------------------------------
// 2) Lembrete: 1 hora antes do meet, pra todo mundo que está nele
// ---------------------------------------------------------------------------
export const lembreteMeet1h = onSchedule("every 5 minutes", async () => {
    const agora = Date.now();
    // Janela de 10 minutos em volta da "1 hora antes": rodando de 5 em 5
    // minutos, todo meet cai em exatamente uma passagem — e o carimbo
    // `lembrete1hEm` garante que ninguém leva o aviso duas vezes.
    const de = admin.firestore.Timestamp.fromMillis(agora + 55 * MINUTO);
    const ate = admin.firestore.Timestamp.fromMillis(agora + 65 * MINUTO);

    const snap = await db()
        .collectionGroup("tarefas")
        .where("type", "==", "Meet")
        .where("status", "==", "pendente")
        .where("dueDate", ">=", de)
        .where("dueDate", "<=", ate)
        .get();

    if (snap.empty) return;

    let avisados = 0;
    for (const tarefa of snap.docs) {
        const t = tarefa.data();
        if (t.lembrete1hEm) continue;

        const envolvidos = new Set<string>();
        if (t.userId) envolvidos.add(String(t.userId));
        if (Array.isArray(t.participantesIds)) {
            for (const p of t.participantesIds) {
                if (typeof p === "string" && p) envolvidos.add(p);
            }
        }
        // Meet marcado antes dos convites existirem: o dono está no lead pai.
        if (envolvidos.size === 0) {
            const leadRef = tarefa.ref.parent.parent;
            const lead = leadRef ? await leadRef.get() : null;
            const dono = lead?.data()?.userId;
            if (dono) envolvidos.add(String(dono));
        }
        if (envolvidos.size === 0) continue;

        await enviarPush(
            Array.from(envolvidos),
            "⏰ Meet em 1 hora",
            `${t.description || "Meet"} · ${quandoTexto(t.dueDate)}`,
            {url: "/dashboard/agenda"},
        );
        await tarefa.ref.update({
            lembrete1hEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        avisados++;
    }

    if (avisados > 0) logger.info("lembreteMeet1h: meets avisados", {avisados});
});
