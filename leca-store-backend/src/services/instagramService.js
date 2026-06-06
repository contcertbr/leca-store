const axios = require('axios');
const { getSecret } = require('../utils/secrets');

const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v18.0'; // Verifique a versão mais recente

async function getInstagramPageAccessToken() {
  // Este token deve ser um Page Access Token de longa duração.
  // Você o obterá através do fluxo de autenticação da Meta.
  return await getSecret('INSTAGRAM_PAGE_ACCESS_TOKEN');
}

async function getInstagramBusinessAccountId() {
  // O ID da sua conta comercial do Instagram.
  return await getSecret('INSTAGRAM_BUSINESS_ACCOUNT_ID');
}

async function createInstagramPost(imageUrl, caption) {
  const pageAccessToken = await getInstagramPageAccessToken();
  const instagramBusinessAccountId = await getInstagramBusinessAccountId();

  try {
    // 1. Upload da imagem
    const mediaUploadResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE_URL}/${instagramBusinessAccountId}/media`,
      {
        image_url: imageUrl,
        caption: caption,
        access_token: pageAccessToken,
      }
    );
    const creationId = mediaUploadResponse.data.id;

    // 2. Publicação da mídia
    const mediaPublishResponse = await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE_URL}/${instagramBusinessAccountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: pageAccessToken,
      }
    );

    return mediaPublishResponse.data; // Contém o ID do post publicado
  } catch (error) {
    console.error('Error creating Instagram post:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create Instagram post.');
  }
}

module.exports = {
  createInstagramPost,
};
