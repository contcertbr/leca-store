const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSecret } = require('../utils/secrets');
const admin = require('firebase-admin');
const { checkAuth } = require('../middleware/auth');
const mercadolivreService = require('../services/mercadilivreService');
const firestoreService = require('../services/firestoreService');

const db = admin.firestore();
const MELI_API_URL = 'https://api.mercadolibre.com';

// Rota para iniciar o processo de autorização do Mercado Livre
// O frontend deve ter um botão/link que aponta para '/api/mercadolivre/auth'
router.get('/auth', async (req, res) => {
    try {
        const appId = await getSecret('MELI_APP_ID');
        // A URI de redirect deve ser a URL PÚBLICA do seu backend + /api/mercadolivre/callback
        // É crucial que esta URL esteja listada nas "URIs de redirect" da sua aplicação no ML.
        const redirectUri = process.env.NODE_ENV === 'production'
            ? process.env.MELI_REDIRECT_URI
            : `http://localhost:8080/api/mercadolivre/callback`;

        const authUrl = `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}`;
        
        res.redirect(authUrl);
    } catch (error) {
        console.error('Erro ao construir URL de autorização do ML:', error);
        res.status(500).send('Erro ao iniciar autorização com o Mercado Livre.');
    }
});

// Rota de callback que o Mercado Livre chama após a autorização do usuário
router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Erro: Código de autorização não fornecido pelo Mercado Livre.');
    }

    try {
        const appId = await getSecret('MELI_APP_ID');
        const clientSecret = await getSecret('MELI_CLIENT_SECRET');
        // A URI de redirect aqui DEVE ser EXATAMENTE a mesma usada para gerar o link de autorização
        const redirectUri = process.env.NODE_ENV === 'production'
            ? process.env.MELI_REDIRECT_URI
            : `http://localhost:8080/api/mercadolivre/callback`;

        const response = await axios.post(`${MELI_API_URL}/oauth/token`, null, {
            params: {
                grant_type: 'authorization_code',
                client_id: appId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
            }
        });

        const { access_token, refresh_token, user_id } = response.data;

        // Salva os tokens de forma segura no Firestore, associados ao user_id do ML.
        await db.collection('meli_tokens').doc(String(user_id)).set({
            access_token,
            refresh_token,
            user_id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.send('<h1>Autorização com Mercado Livre concluída com sucesso!</h1><p>Você pode fechar esta janela.</p>');
    } catch (error) {
        console.error('Erro ao trocar código por token do ML:', error.response ? error.response.data : error.message);
        res.status(500).send('Falha ao obter tokens do Mercado Livre. Verifique os logs do servidor.');
    }
});

// Rota para buscar produtos do ML de um vendedor e armazenar em cache no Firestore
router.get('/fetch-and-cache/:sellerId', checkAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    // O service agora buscará o token correto para este sellerId e o renovará se necessário
    const itemIds = await mercadolivreService.getSellerItems(sellerId);
    const products = [];
    for (const itemId of itemIds) {
      const details = await mercadolivreService.getItemDetails(itemId, sellerId);
      await firestoreService.cacheProduct(itemId, details); // Cachear detalhes completos
      products.push(details);
    }
    res.status(200).json({ message: `Produtos do vendedor ${sellerId} buscados e cacheados com sucesso.`, count: products.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para obter produtos do cache (Firestore)
router.get('/cached-products', async (req, res) => {
  try {
    const productId = req.query.id;
    if (productId) {
      const product = await firestoreService.getCachedProduct(productId);
      return product 
        ? res.status(200).json(product)
        : res.status(404).json({ message: 'Produto não encontrado no cache.' });
    }
    // Se nenhum ID for fornecido, lista todos os produtos do cache.
    // Cuidado: pode ser uma operação custosa se houver muitos produtos. Considere paginação.
    const allProducts = await firestoreService.getAllCachedProducts(); // Supondo que essa função exista
    res.status(200).json(allProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para receber notificações (webhooks) do Mercado Livre
router.post('/notifications', (req, res) => {
  // O corpo da requisição (req.body) contém a notificação.
  // É uma boa prática logar para entender os dados que chegam.
  console.log('Notificação recebida do Mercado Livre:', JSON.stringify(req.body, null, 2));

  // É CRUCIAL responder com status 200 OK o mais rápido possível.
  // Se o Mercado Livre não receber uma resposta de sucesso, ele pode parar de enviar notificações.
  res.status(200).send('OK');

  // A lógica para processar a notificação (ex: salvar uma pergunta no Firestore, criar um lead)
  // deve ser executada aqui. Para sistemas maiores, isso seria enviado para uma fila de processamento.
  // Ex: if (req.body.topic === 'questions') { /* processar pergunta */ }
});

module.exports = router;
