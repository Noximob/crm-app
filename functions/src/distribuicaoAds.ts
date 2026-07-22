/**
 * Distribuição de leads de anúncios (Meta Lead Ads) com rodízio de corretores.
 *
 * Contrato de dados (compartilhado com a UI — NÃO alterar sem combinar):
 *
 * Doc `distribuicaoAds/config`:
 *   { ativo: boolean, corretores: string[] (uids na ordem do rodízio),
 *     proximoIndex: number, minutosExclusivo: number (default 5),
 *     minutosGeral: number (default 30), atualizadoEm: Timestamp,
 *     imobiliariaId?: string,
 *     exigirCrmEmDia?: boolean (true → corretor com tarefa ATRASADA no CRM é
 *       pulado no rodízio até resolver; se a escala inteira estiver atrasada,
 *       o rodízio segue normal pra nenhum lead se perder),
 *     crmEmDiaToleranciaHoras?: number (default 48 — só sai da fila quem tem
 *       tarefa vencida há MAIS de X horas; atraso fresco não pune) }
 *
 * Collection `adsLeads/{id}`:
 *   { nome, telefone (só dígitos), origem: 'meta-form'|'meta-whatsapp'|'manual',
 *     campanhaNome?, anuncioNome?, formNome?, metaLeadId?,
 *     status: 'escalado'|'geral'|'aceito'|'nao-atendido',
 *     corretorEscalado: string|null, escaladoEm, prazoAte,
 *     abriuGeralEm?, aceitoPor?, aceitoPorNome?, aceitoEm?, tempoAceiteSeg?,
 *     viaGeral?, leadId?, criadoEm, imobiliariaId,
 *     duplicadoDe?: { leadId, userId, nomeCorretor } (aviso: telefone já é
 *     lead desse corretor no CRM — a distribuição segue normal) }
 *
 * `usuarios/{uid}.fcmTokens: string[]`
 */

import {onRequest, onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

// ---------------------------------------------------------------------------
// Secrets (configurar com: firebase functions:secrets:set NOME)
// ---------------------------------------------------------------------------
const META_PAGE_TOKEN = defineSecret("META_PAGE_TOKEN");
const META_VERIFY_TOKEN = defineSecret("META_VERIFY_TOKEN");
const TEST_SECRET = defineSecret("TEST_SECRET");
// Token de Usuário do Sistema com ads_read (lê as campanhas da conta de anúncios)
const META_ADS_TOKEN = defineSecret("META_ADS_TOKEN");

const GRAPH_BASE = "https://graph.facebook.com/v21.0";
// Conta de anúncios padrão (NoxImoveis, portfólio TEMERÁRIO). Pode ser
// sobrescrita em distribuicaoAds/config.metaAdAccountId.
const DEFAULT_AD_ACCOUNT_ID = "2451035921773388";

const CONFIG_REF_PATH = "distribuicaoAds/config";

type OrigemAdsLead = "meta-form" | "meta-whatsapp" | "manual";

interface DistribuicaoConfig {
    ativo: boolean;
    corretores: string[];
    proximoIndex: number;
    minutosExclusivo: number;
    minutosGeral: number;
    atualizadoEm?: admin.firestore.Timestamp;
    imobiliariaId?: string;
    exigirCrmEmDia?: boolean;
    crmEmDiaToleranciaHoras?: number;
}

interface NovoAdsLead {
    nome: string;
    telefone: string;
    origem: OrigemAdsLead;
    campanhaNome?: string;
    anuncioNome?: string;
    formNome?: string;
    metaLeadId?: string;
    /** Respostas do formulário Meta já formatadas p/ virar anotação do lead */
    respostasForm?: string;
}

interface ResultadoDistribuicao {
    adsLeadId: string;
    status: "escalado" | "geral";
    corretorEscalado: string | null;
    corretores: string[];
}

interface DuplicadoDe {
    leadId: string;
    userId: string;
    nomeCorretor: string;
}

const db = () => admin.firestore();

/** Remove tudo que não for dígito do telefone. */
function somenteDigitos(telefone: string): string {
    return (telefone || "").replace(/\D/g, "");
}

/** Remove chaves com valor undefined (Firestore rejeita undefined). */
function semUndefined<T extends Record<string, unknown>>(obj: T): T {
    const limpo: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) limpo[k] = v;
    }
    return limpo as T;
}

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

/**
 * Envia push (FCM) para os uids informados usando usuarios/{uid}.fcmTokens.
 * Tokens inválidos são removidos do documento do usuário.
 */
export async function enviarPush(
    uids: string[],
    title: string,
    body: string,
    data: Record<string, string> = {},
): Promise<void> {
    const uidsUnicos = Array.from(new Set(uids.filter(Boolean)));
    if (uidsUnicos.length === 0) return;

    try {
        const docs = await Promise.all(
            uidsUnicos.map((uid) => db().collection("usuarios").doc(uid).get()),
        );

        // token -> uid dono (para poder remover tokens inválidos depois)
        const tokenDono = new Map<string, string>();
        for (const doc of docs) {
            if (!doc.exists) continue;
            const tokens = (doc.data()?.fcmTokens || []) as string[];
            for (const t of tokens) {
                if (typeof t === "string" && t.length > 0) tokenDono.set(t, doc.id);
            }
        }

        const tokens = Array.from(tokenDono.keys());
        if (tokens.length === 0) {
            logger.info("enviarPush: nenhum fcmToken encontrado", {uids: uidsUnicos});
            return;
        }

        // Payload DATA-ONLY (sem bloco `notification`): assim o navegador/FCM
        // NÃO exibe nada automaticamente e o service worker é o único
        // responsável por chamar showNotification (evita notificação duplicada).
        const resposta = await admin.messaging().sendEachForMulticast({
            tokens,
            data: {title, body, url: "/dashboard", ...data},
        });

        // Remove tokens que o FCM diz não existirem mais
        const remocoes: Promise<unknown>[] = [];
        resposta.responses.forEach((res, i) => {
            if (res.success) return;
            const codigo = res.error?.code || "";
            if (
                codigo === "messaging/registration-token-not-registered" ||
                codigo === "messaging/invalid-registration-token" ||
                codigo === "messaging/invalid-argument"
            ) {
                const token = tokens[i];
                const uid = tokenDono.get(token);
                if (uid) {
                    remocoes.push(
                        db().collection("usuarios").doc(uid).update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
                        }).catch((e) => logger.warn("Falha ao remover token inválido", {uid, e})),
                    );
                }
            }
        });
        await Promise.all(remocoes);

        logger.info("enviarPush: concluído", {
            enviados: resposta.successCount,
            falhas: resposta.failureCount,
        });
    } catch (error) {
        logger.error("enviarPush: erro inesperado (não interrompe o fluxo)", error);
    }
}

// ---------------------------------------------------------------------------
// Núcleo: criar adsLead e distribuir via rodízio
// ---------------------------------------------------------------------------

/**
 * Aviso de duplicidade: procura no CRM um lead da imobiliária com o mesmo
 * telefone. Se achar, devolve quem é o dono (pra UI avisar "esse telefone já
 * é lead do Fulano"). NUNCA lança — é só um aviso, a distribuição segue igual.
 */
async function buscarLeadDuplicado(telefone: string): Promise<DuplicadoDe | null> {
    try {
        if (!telefone || telefone.length < 8) return null;

        // Resolve a imobiliária do mesmo jeito que criarEDistribuir
        // (config.imobiliariaId → doc do 1º corretor da escala)
        const configSnap = await db().doc(CONFIG_REF_PATH).get();
        const config = (configSnap.data() || {}) as Partial<DistribuicaoConfig>;
        const corretores = Array.isArray(config.corretores) ? config.corretores : [];
        let imobiliariaId = config.imobiliariaId || "";
        if (!imobiliariaId && corretores.length > 0) {
            const usuarioSnap = await db().collection("usuarios").doc(corretores[0]).get();
            imobiliariaId = (usuarioSnap.data()?.imobiliariaId as string) || "";
        }
        if (!imobiliariaId) return null;

        // O Meta manda o telefone com 55 na frente; no CRM o whatsapp
        // normalmente fica sem o 55 — checa as duas formas.
        const candidatos = Array.from(new Set([
            telefone,
            telefone.startsWith("55") && telefone.length >= 12 ? telefone.slice(2) : "",
        ])).filter((t) => t.length >= 8);

        for (const cand of candidatos) {
            const snap = await db().collection("leads")
                .where("imobiliariaId", "==", imobiliariaId)
                .where("whatsapp", "==", cand)
                .limit(1)
                .get();
            if (snap.empty) continue;

            const leadDoc = snap.docs[0];
            const userId = (leadDoc.data().userId as string) || "";
            let nomeCorretor = "outro corretor";
            if (userId) {
                const donoSnap = await db().collection("usuarios").doc(userId).get();
                nomeCorretor = (donoSnap.data()?.nome as string) || nomeCorretor;
            }
            return {leadId: leadDoc.id, userId, nomeCorretor};
        }
        return null;
    } catch (error) {
        logger.warn("buscarLeadDuplicado: falha ao checar duplicidade (segue sem aviso)", error);
        return null;
    }
}

/** dueDate do espelho tarefasPendentes → ms (Timestamp, {seconds} ou string). */
function dueDateMs(due: unknown): number {
    const d = due as {toMillis?: () => number; seconds?: number} | string | null | undefined;
    if (d && typeof d === "object" && typeof d.toMillis === "function") return d.toMillis();
    if (d && typeof d === "object" && typeof d.seconds === "number") return d.seconds * 1000;
    if (typeof d === "string") return Date.parse(d);
    return NaN;
}

/**
 * "CRM em dia" = nenhuma tarefa pendente vencida há mais de `toleranciaMs`.
 * Atraso fresco (dentro da tolerância) NÃO tira o corretor da fila — só quem
 * deixou tarefa mofando. Lê o espelho `tarefasPendentes` dos leads de cada
 * corretor (field mask — barato) e devolve o conjunto dos que estão fora da
 * fila. Falha na leitura de um corretor → ele é considerado em dia (o filtro
 * nunca pode travar o rodízio).
 */
async function corretoresComAtraso(corretores: string[], toleranciaMs: number): Promise<Set<string>> {
    const corteMs = Date.now() - Math.max(0, toleranciaMs);
    const comAtraso = new Set<string>();
    await Promise.all(corretores.map(async (uid) => {
        try {
            const snap = await db().collection("leads")
                .where("userId", "==", uid)
                .select("tarefasPendentes")
                .get();
            for (const doc of snap.docs) {
                const pendentes = (doc.data().tarefasPendentes || []) as {dueDate?: unknown}[];
                if (pendentes.some((t) => {
                    const ms = dueDateMs(t?.dueDate);
                    return isFinite(ms) && ms < corteMs;
                })) {
                    comAtraso.add(uid);
                    return;
                }
            }
        } catch (e) {
            logger.warn("corretoresComAtraso: falha ao checar (considera em dia)", {uid, e});
        }
    }));
    return comAtraso;
}

/**
 * Monta o conjunto de corretores fora da fila (exigirCrmEmDia ligado).
 * Se TODOS estiverem atrasados, devolve vazio — melhor distribuir do que
 * deixar o lead sem dono.
 */
async function foraDaFilaPorAtraso(config: Partial<DistribuicaoConfig>): Promise<Set<string>> {
    const corretores = Array.isArray(config.corretores) ? config.corretores : [];
    if (config.exigirCrmEmDia !== true || corretores.length === 0) return new Set();
    const tolHoras = typeof config.crmEmDiaToleranciaHoras === "number" && config.crmEmDiaToleranciaHoras >= 0 ?
        config.crmEmDiaToleranciaHoras : 48;
    const comAtraso = await corretoresComAtraso(corretores, tolHoras * 60 * 60 * 1000);
    if (comAtraso.size >= corretores.length) {
        logger.warn("exigirCrmEmDia: escala inteira com atraso — rodízio segue normal");
        return new Set();
    }
    if (comAtraso.size > 0) {
        logger.info("exigirCrmEmDia: corretores pulados por atraso no CRM", {pulados: Array.from(comAtraso)});
    }
    return comAtraso;
}

/**
 * Cria o adsLead e escala o próximo corretor do rodízio (transação sobre
 * distribuicaoAds/config). Se a distribuição estiver inativa ou sem
 * corretores, cria o lead direto no status 'geral' (fallback) para que
 * ninguém perca o lead. Depois do commit, dispara os pushes.
 */
export async function criarEDistribuir(novo: NovoAdsLead): Promise<ResultadoDistribuicao> {
    const configRef = db().doc(CONFIG_REF_PATH);
    const adsLeadRef = db().collection("adsLeads").doc();
    const telefone = somenteDigitos(novo.telefone);

    // Aviso (não bloqueia): esse telefone já é lead de algum corretor no CRM?
    const duplicadoDe = await buscarLeadDuplicado(telefone);

    // Filtro "só recebe quem está com o CRM em dia" — checado FORA da transação
    // (as queries são caras; uma corrida rara só muda quem é pulado nesta rodada)
    const configPre = ((await configRef.get()).data() || {}) as Partial<DistribuicaoConfig>;
    const foraDaFila = configPre.ativo === true ? await foraDaFilaPorAtraso(configPre) : new Set<string>();

    const resultado = await db().runTransaction(async (tx): Promise<ResultadoDistribuicao> => {
        const configSnap = await tx.get(configRef);
        const config = (configSnap.data() || {}) as Partial<DistribuicaoConfig>;

        const ativo = config.ativo === true;
        const corretores = Array.isArray(config.corretores) ? config.corretores : [];
        const minutosExclusivo = typeof config.minutosExclusivo === "number" && config.minutosExclusivo > 0 ?
            config.minutosExclusivo : 5;
        const minutosGeral = typeof config.minutosGeral === "number" && config.minutosGeral > 0 ?
            config.minutosGeral : 30;

        // imobiliariaId: preferir o gravado na config; senão, ler do doc do 1º corretor
        let imobiliariaId = config.imobiliariaId || "";
        if (!imobiliariaId && corretores.length > 0) {
            const usuarioSnap = await tx.get(db().collection("usuarios").doc(corretores[0]));
            imobiliariaId = (usuarioSnap.data()?.imobiliariaId as string) || "";
        }

        const agora = admin.firestore.Timestamp.now();
        const base = semUndefined({
            nome: novo.nome || "Lead sem nome",
            telefone,
            origem: novo.origem,
            campanhaNome: novo.campanhaNome,
            anuncioNome: novo.anuncioNome,
            formNome: novo.formNome,
            metaLeadId: novo.metaLeadId,
            respostasForm: novo.respostasForm || undefined,
            criadoEm: agora,
            imobiliariaId,
            duplicadoDe: duplicadoDe ?? undefined,
        });

        if (!ativo || corretores.length === 0) {
            // Fallback: sem rodízio ativo → vai direto para o "geral"
            const prazoAte = admin.firestore.Timestamp.fromMillis(
                agora.toMillis() + minutosGeral * 60 * 1000,
            );
            tx.set(adsLeadRef, {
                ...base,
                status: "geral",
                corretorEscalado: null,
                escaladoEm: agora,
                abriuGeralEm: agora,
                prazoAte,
            });
            return {adsLeadId: adsLeadRef.id, status: "geral", corretorEscalado: null, corretores};
        }

        const proximoIndex = typeof config.proximoIndex === "number" ? config.proximoIndex : 0;
        // Pula quem está fora da fila (CRM atrasado) — anda o rodízio até achar alguém em dia
        let idxEscolhido = proximoIndex % corretores.length;
        for (let k = 0; k < corretores.length; k++) {
            const idx = (proximoIndex + k) % corretores.length;
            if (!foraDaFila.has(corretores[idx])) {
                idxEscolhido = idx;
                break;
            }
        }
        const corretorEscalado = corretores[idxEscolhido];
        const prazoAte = admin.firestore.Timestamp.fromMillis(
            agora.toMillis() + minutosExclusivo * 60 * 1000,
        );

        tx.set(adsLeadRef, {
            ...base,
            status: "escalado",
            corretorEscalado,
            escaladoEm: agora,
            prazoAte,
        });
        tx.update(configRef, {proximoIndex: (idxEscolhido + 1) % corretores.length});

        return {adsLeadId: adsLeadRef.id, status: "escalado", corretorEscalado, corretores};
    });

    // Pushes fora da transação (efeito colateral pós-commit)
    const titulo = "🔥 Novo lead de anúncio!";
    const corpo = `${novo.nome || "Novo lead"} — toque para aceitar`;
    const dataPush = {tipo: "adsLead", adsLeadId: resultado.adsLeadId};

    if (resultado.status === "escalado" && resultado.corretorEscalado) {
        await enviarPush([resultado.corretorEscalado], titulo, corpo, dataPush);
    } else {
        await enviarPush(resultado.corretores, titulo, corpo, dataPush);
    }

    logger.info("criarEDistribuir: adsLead criado", resultado);
    return resultado;
}

// ---------------------------------------------------------------------------
// 1) Webhook do Meta (Lead Ads)
// ---------------------------------------------------------------------------

interface MetaFieldData {
    name: string;
    values: string[];
}

/** Busca detalhes do lead + anúncio na Graph API. */
async function buscarLeadNaGraph(leadgenId: string, adId: string | undefined, pageToken: string): Promise<NovoAdsLead> {
    const leadResp = await axios.get(`${GRAPH_BASE}/${leadgenId}`, {
        params: {access_token: pageToken},
    });
    const fieldData = (leadResp.data?.field_data || []) as MetaFieldData[];

    const pegarCampo = (...nomes: string[]): string => {
        for (const nome of nomes) {
            const campo = fieldData.find((f) =>
                (f.name || "").toLowerCase().includes(nome),
            );
            if (campo?.values?.[0]) return campo.values[0];
        }
        return "";
    };

    const nome = pegarCampo("full_name", "nome", "name") || "Lead Meta";
    const telefone = pegarCampo("phone", "telefone", "whatsapp", "celular");

    // Todas as OUTRAS respostas do formulário viram anotação do lead — o corretor
    // já abre o lead sabendo o que a pessoa respondeu (orçamento, região, prazo…).
    const respostasForm = montarRespostasForm(fieldData);

    let campanhaNome: string | undefined;
    let anuncioNome: string | undefined;
    const formNome: string | undefined = leadResp.data?.form?.name || undefined;

    const efetivoAdId = adId || leadResp.data?.ad_id;
    if (efetivoAdId) {
        try {
            const adResp = await axios.get(`${GRAPH_BASE}/${efetivoAdId}`, {
                params: {access_token: pageToken, fields: "name,campaign{name}"},
            });
            anuncioNome = adResp.data?.name || undefined;
            campanhaNome = adResp.data?.campaign?.name || undefined;
        } catch (e) {
            logger.warn("Não foi possível buscar detalhes do anúncio", {adId: efetivoAdId, e});
        }
    }

    return {
        nome,
        telefone,
        origem: "meta-form",
        campanhaNome,
        anuncioNome,
        formNome,
        metaLeadId: leadgenId,
        respostasForm,
    };
}

/**
 * Formata as respostas do formulário Meta como anotação legível do lead.
 * Pula nome/telefone (já viram campos próprios do lead) e campos vazios.
 * Ex.: "📋 Respostas do formulário:\n• Orçamento: até 500 mil\n• Região: Penha"
 */
function montarRespostasForm(fieldData: MetaFieldData[]): string {
    const IGNORAR = /(full_name|first_name|last_name|^nome$|^name$|phone|telefone|whatsapp|celular|email|e-mail)/i;
    const linhas: string[] = [];
    for (const f of fieldData) {
        const chave = (f.name || "").trim();
        const valor = (f.values || []).filter(Boolean).join(", ").trim();
        if (!chave || !valor || IGNORAR.test(chave)) continue;
        const rotulo = chave.replace(/_/g, " ").replace(/\?+$/, "").trim();
        const rotuloCap = rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
        linhas.push(`• ${rotuloCap}: ${valor}`);
    }
    return linhas.length > 0 ? `📋 Respostas do formulário:\n${linhas.join("\n")}` : "";
}

/**
 * Webhook do Meta:
 * - GET: handshake de verificação (hub.mode/hub.verify_token/hub.challenge)
 * - POST: eventos leadgen → busca detalhes na Graph API e distribui
 *
 * Sempre responde 200 no POST (o Meta reenvia em caso de erro); erros são
 * logados e o evento bruto é guardado em `adsLeadsErros` para replay.
 */
export const metaLeadsWebhook = onRequest(
    {secrets: [META_PAGE_TOKEN, META_VERIFY_TOKEN], invoker: "public"},
    async (request, response) => {
        // --- Verificação (GET) ---
        if (request.method === "GET") {
            const mode = request.query["hub.mode"];
            const token = request.query["hub.verify_token"];
            const challenge = request.query["hub.challenge"];
            const esperado = META_VERIFY_TOKEN.value() || process.env.META_VERIFY_TOKEN || "";

            if (mode === "subscribe" && esperado && token === esperado) {
                logger.info("metaLeadsWebhook: verificação OK");
                response.status(200).send(String(challenge || ""));
            } else {
                logger.warn("metaLeadsWebhook: verificação FALHOU", {mode, tokenRecebido: !!token});
                response.status(403).send("Forbidden");
            }
            return;
        }

        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }

        // --- Eventos (POST): processa mas SEMPRE devolve 200 ---
        try {
            const body = request.body || {};
            const entries = Array.isArray(body.entry) ? body.entry : [];
            const pageToken = META_PAGE_TOKEN.value() || process.env.META_PAGE_TOKEN || "";

            for (const entry of entries) {
                const changes = Array.isArray(entry?.changes) ? entry.changes : [];
                for (const change of changes) {
                    if (change?.field !== "leadgen") continue;
                    const valor = change.value || {};
                    const leadgenId = valor.leadgen_id ? String(valor.leadgen_id) : "";
                    const adId = valor.ad_id ? String(valor.ad_id) : undefined;
                    if (!leadgenId) continue;

                    if (!pageToken) {
                        // Ainda não ligamos o token: guarda o evento bruto p/ replay
                        logger.error("META_PAGE_TOKEN não configurado — evento salvo em adsLeadsErros", {leadgenId});
                        await db().collection("adsLeadsErros").add({
                            motivo: "META_PAGE_TOKEN ausente",
                            evento: valor,
                            recebidoEm: admin.firestore.Timestamp.now(),
                        });
                        continue;
                    }

                    try {
                        const novo = await buscarLeadNaGraph(leadgenId, adId, pageToken);
                        if (!somenteDigitos(novo.telefone)) {
                            logger.warn("Lead do Meta sem telefone", {leadgenId});
                        }
                        await criarEDistribuir(novo);
                    } catch (erroLead) {
                        logger.error("Erro ao processar leadgen — evento salvo em adsLeadsErros", {leadgenId, erroLead});
                        await db().collection("adsLeadsErros").add({
                            motivo: "erro ao buscar/distribuir",
                            erro: erroLead instanceof Error ? erroLead.message : String(erroLead),
                            evento: valor,
                            recebidoEm: admin.firestore.Timestamp.now(),
                        }).catch(() => undefined);
                    }
                }
            }
        } catch (error) {
            logger.error("metaLeadsWebhook: erro geral (respondendo 200 mesmo assim)", error);
        }

        response.status(200).send("EVENT_RECEIVED");
    },
);

// ---------------------------------------------------------------------------
// 3) Expiração de prazos (a cada 1 minuto)
// ---------------------------------------------------------------------------

/**
 * A cada minuto:
 * - 'escalado' vencido → vira 'geral' (abre para toda a escala) + push geral
 * - 'geral' vencido → vira 'nao-atendido' (sem push)
 */
export const expirarAdsLeads = onSchedule("every 1 minutes", async () => {
    const agora = admin.firestore.Timestamp.now();

    // Escalados vencidos → geral
    const escaladosVencidos = await db().collection("adsLeads")
        .where("status", "==", "escalado")
        .where("prazoAte", "<=", agora)
        .get();

    if (!escaladosVencidos.empty) {
        const configSnap = await db().doc(CONFIG_REF_PATH).get();
        const config = (configSnap.data() || {}) as Partial<DistribuicaoConfig>;
        const corretores = Array.isArray(config.corretores) ? config.corretores : [];
        const minutosGeral = typeof config.minutosGeral === "number" && config.minutosGeral > 0 ?
            config.minutosGeral : 30;

        for (const doc of escaladosVencidos.docs) {
            const prazoAte = admin.firestore.Timestamp.fromMillis(
                agora.toMillis() + minutosGeral * 60 * 1000,
            );
            await doc.ref.update({
                status: "geral",
                abriuGeralEm: agora,
                prazoAte,
            });
            const dados = doc.data();
            await enviarPush(
                corretores,
                "⚡ Lead liberado para todos!",
                `${dados.nome || "Lead"} não foi aceito — quem chegar primeiro leva`,
                {tipo: "adsLead", adsLeadId: doc.id},
            );
            logger.info("expirarAdsLeads: escalado → geral", {adsLeadId: doc.id});
        }
    }

    // Gerais vencidos → não atendido (sem push)
    const geraisVencidos = await db().collection("adsLeads")
        .where("status", "==", "geral")
        .where("prazoAte", "<=", agora)
        .get();

    for (const doc of geraisVencidos.docs) {
        await doc.ref.update({status: "nao-atendido"});
        logger.info("expirarAdsLeads: geral → nao-atendido", {adsLeadId: doc.id});
    }
});

// ---------------------------------------------------------------------------
// 5) Re-disparo manual pelo admin
// ---------------------------------------------------------------------------

/**
 * Callable: re-escala um adsLead para o próximo corretor do rodízio.
 * Requer usuário autenticado e admin (tipoConta==='imobiliaria' ou
 * permissoes.admin===true).
 */
export const redistribuirAdsLead = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "É preciso estar logado.");
    }

    const chamadorSnap = await db().collection("usuarios").doc(request.auth.uid).get();
    const chamador = chamadorSnap.data() || {};
    const ehAdmin = chamador.tipoConta === "imobiliaria" || chamador.permissoes?.admin === true;
    if (!ehAdmin) {
        throw new HttpsError("permission-denied", "Apenas administradores podem redistribuir leads.");
    }

    const adsLeadId = String(request.data?.adsLeadId || "");
    if (!adsLeadId) {
        throw new HttpsError("invalid-argument", "Informe o adsLeadId.");
    }

    const configRef = db().doc(CONFIG_REF_PATH);
    const adsLeadRef = db().collection("adsLeads").doc(adsLeadId);

    // Mesmo filtro do rodízio automático: quem tá com o CRM atrasado é pulado
    const configPre = ((await configRef.get()).data() || {}) as Partial<DistribuicaoConfig>;
    const foraDaFila = await foraDaFilaPorAtraso(configPre);

    const resultado = await db().runTransaction(async (tx) => {
        const [configSnap, leadSnap] = await Promise.all([
            tx.get(configRef),
            tx.get(adsLeadRef),
        ]);

        if (!leadSnap.exists) {
            throw new HttpsError("not-found", "adsLead não encontrado.");
        }

        const config = (configSnap.data() || {}) as Partial<DistribuicaoConfig>;
        const corretores = Array.isArray(config.corretores) ? config.corretores : [];
        if (corretores.length === 0) {
            throw new HttpsError("failed-precondition", "Nenhum corretor na escala de distribuição.");
        }
        const minutosExclusivo = typeof config.minutosExclusivo === "number" && config.minutosExclusivo > 0 ?
            config.minutosExclusivo : 5;
        const proximoIndex = typeof config.proximoIndex === "number" ? config.proximoIndex : 0;
        let idxEscolhido = proximoIndex % corretores.length;
        for (let k = 0; k < corretores.length; k++) {
            const idx = (proximoIndex + k) % corretores.length;
            if (!foraDaFila.has(corretores[idx])) {
                idxEscolhido = idx;
                break;
            }
        }
        const corretorEscalado = corretores[idxEscolhido];

        const agora = admin.firestore.Timestamp.now();
        const prazoAte = admin.firestore.Timestamp.fromMillis(
            agora.toMillis() + minutosExclusivo * 60 * 1000,
        );

        tx.update(adsLeadRef, {
            status: "escalado",
            corretorEscalado,
            escaladoEm: agora,
            prazoAte,
        });
        tx.update(configRef, {proximoIndex: (idxEscolhido + 1) % corretores.length});

        return {corretorEscalado, nome: (leadSnap.data()?.nome as string) || "Lead"};
    });

    await enviarPush(
        [resultado.corretorEscalado],
        "🔥 Lead redirecionado para você!",
        `${resultado.nome} — toque para aceitar`,
        {tipo: "adsLead", adsLeadId},
    );

    return {ok: true, corretorEscalado: resultado.corretorEscalado};
});

// ---------------------------------------------------------------------------
// 6) Criação de lead de teste (antes da ligação com o Meta)
// ---------------------------------------------------------------------------

/**
 * HTTPS de teste: cria um lead falso passando por todo o fluxo de
 * distribuição. Protegido por query param ?secret= (secret TEST_SECRET).
 *
 * Ex.: GET .../testeCriarAdsLead?secret=XXX&nome=Fulano&telefone=47999998888
 */
export const testeCriarAdsLead = onRequest(
    {secrets: [TEST_SECRET], invoker: "public"},
    async (request, response) => {
        const esperado = TEST_SECRET.value() || process.env.TEST_SECRET || "";
        const recebido = String(request.query.secret || "");
        if (!esperado || recebido !== esperado) {
            response.status(403).send("Forbidden");
            return;
        }

        try {
            const nome = String(request.query.nome || "Lead de Teste");
            const telefone = String(request.query.telefone || "47999990000");
            const resultado = await criarEDistribuir({
                nome,
                telefone,
                origem: "manual",
                campanhaNome: String(request.query.campanha || "Campanha Teste"),
                anuncioNome: String(request.query.anuncio || "Anúncio Teste"),
                formNome: "Teste manual",
            });
            response.status(200).json(resultado);
        } catch (error) {
            logger.error("testeCriarAdsLead: erro", error);
            response.status(500).json({erro: error instanceof Error ? error.message : String(error)});
        }
    },
);

// ---------------------------------------------------------------------------
// 6.5) Conectar a Página ao app (subscribed_apps) — o passo que faz os leads
//      de formulário (Face + Insta) DISPARAREM o webhook. Sem isso o app tem o
//      campo leadgen assinado, mas a página não "empurra" os leads.
// ---------------------------------------------------------------------------

/**
 * Callable (admin): assina a Página no app pro campo leadgen, usando o
 * META_PAGE_TOKEN (token da página). Devolve o nome da página pra conferência.
 * Idempotente: se já estava assinada, só confirma.
 */
export const conectarPaginaLeadgen = onCall(
    {secrets: [META_PAGE_TOKEN]},
    async (request): Promise<{ok: boolean; motivo?: string; pagina?: string; pageId?: string; jaEstava?: boolean}> => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "É preciso estar logado.");
        }
        const chamadorSnap = await db().collection("usuarios").doc(request.auth.uid).get();
        const chamador = chamadorSnap.data() || {};
        const ehAdmin = chamador.tipoConta === "imobiliaria" || chamador.permissoes?.admin === true;
        if (!ehAdmin) {
            throw new HttpsError("permission-denied", "Apenas administradores.");
        }

        const token = META_PAGE_TOKEN.value() || process.env.META_PAGE_TOKEN || "";
        if (!token) return {ok: false, motivo: "sem_token"};

        try {
            // 1) Quem é o dono do token? (precisa ser um token de PÁGINA)
            const me = await axios.get(`${GRAPH_BASE}/me`, {
                params: {access_token: token, fields: "id,name"},
                timeout: 15000,
            });
            const pageId = String(me.data?.id || "");
            const pagina = String(me.data?.name || "");
            if (!pageId) return {ok: false, motivo: "token_sem_pagina"};

            // 2) Já está assinada pro leadgen?
            let jaEstava = false;
            try {
                const subs = await axios.get(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
                    params: {access_token: token},
                    timeout: 15000,
                });
                const lista = (subs.data?.data || []) as any[];
                jaEstava = lista.some((a) =>
                    Array.isArray(a?.subscribed_fields) && a.subscribed_fields.includes("leadgen"),
                );
            } catch (e) {
                logger.warn("conectarPaginaLeadgen: falha ao checar subscribed_apps (segue e tenta assinar)", e);
            }

            // 3) Assina (idempotente — reforça o leadgen mesmo se já estava)
            await axios.post(`${GRAPH_BASE}/${pageId}/subscribed_apps`, null, {
                params: {access_token: token, subscribed_fields: "leadgen"},
                timeout: 15000,
            });

            logger.info("conectarPaginaLeadgen: página conectada", {pageId, pagina, jaEstava});
            return {ok: true, pagina, pageId, jaEstava};
        } catch (error: any) {
            const fb = error?.response?.data?.error;
            logger.warn("conectarPaginaLeadgen: falha no Graph", {code: fb?.code, msg: fb?.message});
            if (fb?.code === 190 || fb?.code === 200 || fb?.code === 10) {
                return {ok: false, motivo: "sem_permissao"};
            }
            return {ok: false, motivo: "erro_graph"};
        }
    },
);

// ---------------------------------------------------------------------------
// 7) Campanhas do Meta (status ATIVO) — pra mostrar campanhas rodando mesmo
//    sem lead ainda. Lê a conta de anúncios via Graph API.
// ---------------------------------------------------------------------------

interface CampanhaMeta {
    id: string;
    nome: string;
    objetivo: string;
    status: string; // effective_status: ACTIVE | PAUSED | ...
}

/**
 * Callable (admin): lista as campanhas ATIVAS da conta de anúncios do Meta.
 * Usa META_ADS_TOKEN (token com ads_read); se não houver, tenta META_PAGE_TOKEN
 * e, se o token não tiver permissão de anúncios, devolve {ok:false, motivo}
 * pra UI orientar a conectar o acesso — nunca lança por falta de permissão.
 */
export const listarCampanhasMeta = onCall(
    {secrets: [META_ADS_TOKEN, META_PAGE_TOKEN]},
    async (request): Promise<{ok: boolean; motivo?: string; contaId?: string; campanhas?: CampanhaMeta[]}> => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "É preciso estar logado.");
        }
        const chamadorSnap = await db().collection("usuarios").doc(request.auth.uid).get();
        const chamador = chamadorSnap.data() || {};
        const ehAdmin = chamador.tipoConta === "imobiliaria" || chamador.permissoes?.admin === true;
        if (!ehAdmin) {
            throw new HttpsError("permission-denied", "Apenas administradores.");
        }

        // Token de anúncios (ads_read); fallback pro token da página se faltar
        const token = META_ADS_TOKEN.value() || process.env.META_ADS_TOKEN ||
            META_PAGE_TOKEN.value() || process.env.META_PAGE_TOKEN || "";
        if (!token) return {ok: false, motivo: "sem_token"};

        // Conta de anúncios: config da imobiliária → padrão conhecido
        const configSnap = await db().doc(CONFIG_REF_PATH).get();
        const config = (configSnap.data() || {}) as Partial<DistribuicaoConfig> & {metaAdAccountId?: string};
        const contaId = (config.metaAdAccountId || DEFAULT_AD_ACCOUNT_ID).replace(/^act_/, "");

        try {
            const resp = await axios.get(`${GRAPH_BASE}/act_${contaId}/campaigns`, {
                params: {
                    access_token: token,
                    fields: "name,effective_status,objective",
                    // só as que estão rodando de fato
                    effective_status: JSON.stringify(["ACTIVE"]),
                    limit: 200,
                },
                timeout: 15000,
            });
            const data = (resp.data?.data || []) as any[];
            const campanhas: CampanhaMeta[] = data.map((c) => ({
                id: String(c.id || ""),
                nome: String(c.name || ""),
                objetivo: String(c.objective || ""),
                status: String(c.effective_status || ""),
            }));
            return {ok: true, contaId, campanhas};
        } catch (error: any) {
            const fb = error?.response?.data?.error;
            const code = fb?.code;
            logger.warn("listarCampanhasMeta: falha no Graph", {code, msg: fb?.message});
            // 200 (permissão) / 190 (token) → orientar a conectar; resto = erro genérico
            if (code === 200 || code === 10 || code === 190 || code === 2635) {
                return {ok: false, motivo: "sem_permissao_ads"};
            }
            return {ok: false, motivo: "erro_graph"};
        }
    },
);
