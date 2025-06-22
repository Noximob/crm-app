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

// Define a estrutura esperada dos dados para clareza
interface Automacao {
    status: "inativa" | "ativa" | "cancelada";
    nomeTratamento?: string;
}

interface Lead {
    userId: string;
    telefone: string;
    automacao: Automacao;
}

interface User {
    zapiInstanceId?: string;
    zapiInstanceToken?: string;
}

interface Mensagem {
    dia: number;
    texto: string;
}

// Função que é acionada quando um lead é atualizado
export const onLeadAutomationStarted = onDocumentUpdated("leads/{leadId}", async (event) => {
    logger.info(`Iniciando verificação para o lead: ${event.params.leadId}`);

    const beforeData = event.data?.before.data() as Lead | undefined;
    const afterData = event.data?.after.data() as Lead | undefined;

    // Se não houver dados antes ou depois, ou se o status não mudou para 'ativa', encerra a função.
    if (!beforeData || !afterData) {
        logger.info("Dados do lead não encontrados. Encerrando.");
        return;
    }

    const beforeStatus = beforeData.automacao?.status;
    const afterStatus = afterData.automacao?.status;

    if (beforeStatus === "ativa" || afterStatus !== "ativa") {
        logger.info(`Status não mudou para 'ativa' ou já estava 'ativa'. Status anterior: ${beforeStatus}, Status novo: ${afterStatus}. Encerrando.`);
        return;
    }

    logger.info(`Automação ativada para o lead ${event.params.leadId}. Procedendo com o envio.`);

    try {
        // 1. Obter os dados do usuário (corretor) para pegar as credenciais do Z-API
        const userDoc = await admin.firestore().collection("usuarios").doc(afterData.userId).get();
        if (!userDoc.exists) {
            throw new Error(`Usuário ${afterData.userId} não encontrado.`);
        }
        const userData = userDoc.data() as User;
        const {zapiInstanceId, zapiInstanceToken} = userData;

        if (!zapiInstanceId || !zapiInstanceToken) {
            throw new Error(`Credenciais do Z-API não configuradas para o usuário ${afterData.userId}.`);
        }

        // 2. Obter as configurações de mensagens
        const configDoc = await admin.firestore().collection("configuracoes").doc("automacaoMensagens").get();
        if (!configDoc.exists) {
            throw new Error("Documento de configuração 'automacaoMensagens' não encontrado.");
        }
        const mensagens = (configDoc.data()?.mensagens || []) as Mensagem[];
        const primeiraMensagem = mensagens.find((m) => m.dia === 0);

        if (!primeiraMensagem || !primeiraMensagem.texto) {
            logger.info("Nenhuma mensagem configurada para o dia 0. Encerrando.");
            return;
        }

        // 3. Preparar e enviar a mensagem via Z-API
        let textoFinal = primeiraMensagem.texto;
        if (afterData.automacao.nomeTratamento) {
            textoFinal = textoFinal.replace(/{{nomeTratamento}}/g, afterData.automacao.nomeTratamento);
        }
        
        // Remove caracteres não numéricos do telefone
        const telefoneLimpo = afterData.telefone.replace(/\D/g, "");
        // Garante que o código do país (55) está presente
        const telefoneComCodigo = telefoneLimpo.startsWith("55") ? telefoneLimpo : `55${telefoneLimpo}`;

        // CORREÇÃO: A URL correta, de acordo com a documentação do Z-API, inclui o token.
        const url = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-text`;
        
        logger.info(`Enviando para: ${url} com o telefone: ${telefoneComCodigo}`);

        await axios.post(url, {
            phone: telefoneComCodigo,
            message: textoFinal,
        }, {
            headers: {
                // A documentação do Z-API sugere um 'Client-Token' aqui, que seria um token de segurança da conta.
                // Como não temos esse campo, vamos manter o que funcionava antes e não enviar headers extras por enquanto,
                // já que o token principal já está na URL.
            }
        });

        logger.info(`Mensagem do dia 0 enviada com sucesso para o lead ${event.params.leadId}.`);
    } catch (error) {
        logger.error(`Erro ao processar automação para o lead ${event.params.leadId}:`, error);
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
