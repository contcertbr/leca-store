const axios = require('axios');
const { getSecret } = require('../utils/secrets');
const admin = require('firebase-admin');

const db = admin.firestore();
const ML_API_BASE_URL = 'https://api.mercadolivre.com';

/**
 * Obtém um access token válido para um vendedor do Mercado Livre.
 * Ele busca o token no Firestore, verifica se expirou e, se necessário,
 * usa o refresh_token para obter um novo par de tokens, atualizando o banco.
 * @param {string} sellerId O ID do vendedor no Mercado Livre (user_id).
 * @returns {Promise<string>} O access token válido.
 */
async function getMercadoLivreAccessToken(sellerId) {
  const tokenDocRef = db.collection('meli_tokens').doc(String(sellerId));
  const tokenDoc = await tokenDocRef.get();

  if (!tokenDoc.exists) {
    throw new Error(`Nenhum token do Mercado Livre encontrado para o vendedor ${sellerId}. Por favor, autorize a aplicação.`);
  }

  const tokenData = tokenDoc.data();
  const { access_token, refresh_token, updated_at } = tokenData;

  // Tokens do ML expiram em 6 horas (21600 segundos). Usamos 5h55m para segurança.
  const tokenAgeInSeconds = (Date.now() - updated_at.toDate().getTime()) / 1000;
  if (tokenAgeInSeconds < 21300) { // Menos de 5 horas e 55 minutos
    return access_token;
  }

  // Token expirado, vamos renovar
  console.log(`Token para vendedor ${sellerId} expirado. Renovando...`);
  try {
    const appId = await getSecret('MELI_APP_ID');
    const clientSecret = await getSecret('MELI_CLIENT_SECRET');

    const response = await axios.post(`${ML_API_BASE_URL}/oauth/token`, null, {
      params: {
        grant_type: 'refresh_token',
        client_id: appId,
        client_secret: clientSecret,
        refresh_token: refresh_token,
      }
    });

    const newTokens = response.data;

    // Atualiza os novos tokens no Firestore
    await tokenDocRef.update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token, // O ML pode retornar um novo refresh token
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Token para vendedor ${sellerId} renovado com sucesso.`);
    return newTokens.access_token;
  } catch (error) {
    console.error(`Falha ao renovar token para o vendedor ${sellerId}:`, error.response ? error.response.data : error.message);
    // Se a renovação falhar (ex: refresh token revogado), o usuário precisa re-autenticar.
    throw new Error(`Não foi possível renovar o token de acesso do Mercado Livre para o vendedor ${sellerId}. Por favor, re-autorize a aplicação.`);
  }
}

async function getSellerItems(sellerId) {
  const accessToken = await getMercadoLivreAccessToken(sellerId);
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/users/${sellerId}/items/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.results; // Retorna array de IDs dos itens
  } catch (error) {
    console.error('Error fetching seller items from ML:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch Mercado Livre items.');
  }
}

async function getItemDetails(itemId, sellerId) {
  const accessToken = await getMercadoLivreAccessToken(sellerId);
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data; // Retorna detalhes completos do item
  } catch (error) {
    console.error(`Erro ao buscar detalhes do item ${itemId} do ML:`, error.response ? error.response.data : error.message);
    throw new Error(`Failed to fetch Mercado Livre item details for ${itemId}.`);
  }
}

module.exports = {
  getSellerItems,
  getItemDetails,
  getMercadoLivreAccessToken,
};
