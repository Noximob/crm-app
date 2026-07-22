/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/document";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

// Inicializa o Firebase Admin SDK
admin.initializeApp();

// Distribuição de leads de anúncios (Meta Lead Ads)
export {
    metaLeadsWebhook,
    expirarAdsLeads,
    redistribuirAdsLead,
    testeCriarAdsLead,
    listarCampanhasMeta,
    conectarPaginaLeadgen,
} from "./distribuicaoAds";

// Define a estrutura esperada dos dados para clareza
interface Automacao {
    status: "inativa" | "ativa" | "cancelada";
    nomeTratamento?: string;
    initialMessageSent?: boolean; // Campo de segurança para evitar envios duplicados
}

interface Lead {
    userId: string;
    telefone: string;
    automacao: Automacao;
}

interface User {
    zapiInstanceId?: string;
    zapiInstanceToken?: string;
    clientToken?: string;
}

interface Mensagem {
    dia: number;
    texto: string;
    horario?: string; // novo campo
}

const logToLead = async (leadId: string, message: string, data: object = {}) => {
    try {
        const logData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message,
            ...data,
        };
        await admin.firestore().collection("leads").doc(leadId).collection("function_logs").add(logData);
    } catch (error) {
        logger.error(`Falha ao escrever log na 'caixa-preta' do lead ${leadId}`, error);
    }
};

function calcularDataEnvio(dataInicial: Date, dia: number, horario: string): Date {
  let dataEnvio = new Date(dataInicial);
  dataEnvio.setDate(dataEnvio.getDate() + dia);

  // Se cair no domingo, pula para segunda
  if (dataEnvio.getDay() === 0) {
    dataEnvio.setDate(dataEnvio.getDate() + 1);
  }

  // Define o horário, se houver
  if (horario && horario.includes(':')) {
    const [horas, minutos] = horario.split(':').map(Number);
    dataEnvio.setHours(horas, minutos, 0, 0);
  }

  return dataEnvio;
}

// Renomeando a função para forçar uma nova implantação e limpar qualquer cache.
export const sendInitialMessage = onDocumentUpdated("leads/{leadId}", async (event) => {
    const leadId = event.params.leadId;
    
    await logToLead(leadId, "=== Início da execução (v5 - Caixa-Preta) ===");

    try {
        // PASSO 1: Buscar os dados MAIS RECENTES diretamente do Firestore.
        const leadRef = admin.firestore().collection("leads").doc(leadId);
        const leadSnap = await leadRef.get();

        if (!leadSnap.exists) {
            await logToLead(leadId, "❌ Lead não encontrado no banco de dados.", { fatal: true });
            return;
        }

        const leadData = leadSnap.data() as Lead;
        await logToLead(leadId, "Dados atuais lidos do DB", { automacao: leadData.automacao });

        // PASSO 2: A CONDIÇÃO DE ENVIO.
        const shouldSend = leadData.automacao?.status === 'ativa' && !leadData.automacao?.initialMessageSent;

        if (!shouldSend) {
            await logToLead(leadId, "❌ Condição de envio não atendida.", { status: leadData.automacao?.status, sent: leadData.automacao?.initialMessageSent });
            return;
        }
        
        await logToLead(leadId, "✅ Condição de envio atendida. Preparando para enviar.");
        
        // 3. Obter os dados do usuário
        const userDoc = await admin.firestore().collection("usuarios").doc(leadData.userId).get();
        if (!userDoc.exists) {
            throw new Error(`Usuário ${leadData.userId} não encontrado.`);
        }
        const userData = userDoc.data() as User;
        const {zapiInstanceId, zapiInstanceToken, clientToken} = userData;

        await logToLead(leadId, "ℹ️ Credenciais lidas do documento do usuário", {
            userId: leadData.userId,
            credentials: {
                hasInstanceId: !!zapiInstanceId,
                hasInstanceToken: !!zapiInstanceToken,
                hasClientToken: !!clientToken,
            },
        });

        if (!zapiInstanceId || !zapiInstanceToken || !clientToken) {
            throw new Error(`Credenciais do Z-API (instanceId, instanceToken ou clientToken) não configuradas para o usuário ${leadData.userId}.`);
        }
        await logToLead(leadId, "✅ Credenciais Z-API encontradas.");

        // 4. Obter as configurações de mensagens
        const configDoc = await admin.firestore().collection("configuracoes").doc("automacaoMensagens").get();
        if (!configDoc.exists) {
            throw new Error("Documento de configuração 'automacaoMensagens' não encontrado.");
        }
        const mensagens = (configDoc.data()?.mensagens || []) as Mensagem[];
        const primeiraMensagem = mensagens.find((m) => m.dia === 0);

        if (!primeiraMensagem || !primeiraMensagem.texto) {
            await logToLead(leadId, "❌ Nenhuma mensagem configurada para o dia 0.");
            return;
        }
        await logToLead(leadId, "✅ Mensagem do dia 0 encontrada.");

        // 5. Preparar e enviar a mensagem via Z-API
        const nomeTratamento = leadData.automacao.nomeTratamento || "Cliente";
        const textoFinal = primeiraMensagem.texto.replace(/{{nomeTratamento}}/g, nomeTratamento);
        
        const telefoneLimpo = leadData.telefone.replace(/\D/g, "");
        const telefoneComCodigo = telefoneLimpo.startsWith("55") ? telefoneLimpo : `55${telefoneLimpo}`;

        const url = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-text`;
        const payload = {
            phone: telefoneComCodigo,
            message: textoFinal,
        };
        
        await logToLead(leadId, "📤 Enviando para Z-API...", { url, payload });

        await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken,
            }
        });

        await logToLead(leadId, "✅ Mensagem enviada com sucesso para Z-API.");

        // 6. "CARIMBAR" O LEAD para não enviar de novo.
        await leadRef.update({
            'automacao.initialMessageSent': true
        });
        await logToLead(leadId, "✅ Lead carimbado como 'initialMessageSent: true'.");

        // 7. Agendar as próximas mensagens (dias > 0)
        const mensagensFuturas = mensagens.filter((m) => m.dia > 0 && m.texto && m.horario);
        for (const msg of mensagensFuturas) {
            const dataEnvio = calcularDataEnvio(new Date(), msg.dia, msg.horario!);
            // Aqui você pode usar Cloud Tasks, agendamento próprio, ou apenas logar para testar:
            await logToLead(leadId, `Mensagem agendada para ${dataEnvio.toLocaleString()}: ${msg.texto}`);
            // Exemplo: se for usar Cloud Tasks, aqui você criaria a task para dataEnvio
        }

    } catch (error) {
        const errorDetails: { message?: string; status?: number; data?: any } = {};
        if (axios.isAxiosError(error)) {
            errorDetails.message = error.message;
            errorDetails.status = error.response?.status;
            errorDetails.data = error.response?.data;
        } else if (error instanceof Error) {
            errorDetails.message = error.message;
        }
        
        await logToLead(leadId, "💥 ERRO CAPTURADO 💥", { error: errorDetails });
    }
});

// Nova função para receber os webhooks da Z-API
export const zapiWebhookHandler = onRequest((request, response) => {
    // Log do corpo da requisição para vermos o que a Z-API nos enviou
    logger.info("Webhook da Z-API recebido!", {
        body: request.body,
        query: request.query,
        headers: request.headers,
    });

    // Responde com status 200 (OK) para a Z-API saber que recebemos
    response.status(200).send("Webhook recebido com sucesso.");
});
