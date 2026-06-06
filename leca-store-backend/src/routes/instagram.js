const express = require('express');
const router = express.Router();
const { getSecret } = require('../utils/secrets');
const firestoreService = require('../services/firestoreService');

// Rota para verificação do Webhook da Meta (Instagram)
// A Meta envia uma requisição GET para esta URL quando você a configura no painel do app.
router.get('/webhook', async (req, res) => {
    try {
        // Este é o token que você criou e salvou no Secret Manager como INSTAGRAM_VERIFY_TOKEN
        const VERIFY_TOKEN = await getSecret('INSTAGRAM_VERIFY_TOKEN');

        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.warn('Falha na verificação do webhook. Tokens não correspondem.');
            res.sendStatus(403);
        }
    } catch (error) {
        console.error("Erro na verificação do webhook do Instagram:", error);
        res.sendStatus(500);
    }
});

// Rota para receber as notificações (eventos) do Instagram
router.post('/webhook', (req, res) => {
    const body = req.body;

    // Verifique se é um evento do Instagram
    if (body.object === 'instagram') {
        // Processa os eventos de forma assíncrona sem bloquear a resposta para a Meta.
        processInstagramEvents(body.entry).catch(error => {
            console.error("Erro não tratado no processamento de eventos do Instagram:", error);
        });
    }

    // Responda com 200 OK imediatamente para a Meta
    res.status(200).send('EVENT_RECEIVED');
});

/**
 * Processa os eventos do webhook do Instagram de forma segura.
 * @param {Array} entries As entradas do corpo da requisição do webhook.
 */
async function processInstagramEvents(entries) {
    for (const entry of entries) {
        if (entry.messaging) {
            for (const event of entry.messaging) {
                // Se for uma mensagem de texto e não for um "eco" (sua própria mensagem)
                if (event.message && !event.message.is_echo) {
                    const senderId = event.sender.id;
                    const messageText = event.message.text;

                    try {
                        // Salva a mensagem como um novo lead no Firestore
                        await firestoreService.addLead({
                            name: `Instagram User ${senderId}`,
                            email: `${senderId}@instagram.user`, // Email não é fornecido, crie um placeholder
                            message: messageText,
                            source: 'Instagram DM',
                        });
                        console.log(`Novo lead do Instagram (ID: ${senderId}) salvo com sucesso.`);
                    } catch (error) {
                        console.error(`Erro ao salvar lead do Instagram para o senderId ${senderId}:`, error);
                    }
                }
            }
        }
    }
}

module.exports = router;