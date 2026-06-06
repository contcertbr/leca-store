const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Instancia o cliente.
// Em ambientes GCP como Cloud Run, a autenticação é automática.
const client = new SecretManagerServiceClient();

// Cache para evitar chamadas repetidas à API para o mesmo segredo
const secretCache = new Map();

/**
 * Busca a versão mais recente de um segredo no Google Secret Manager.
 * @param {string} secretName O nome do segredo.
 * @returns {Promise<string>} O valor do segredo.
 */
async function getSecret(secretName) {
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName);
  }

  // O ID do projeto é obtido do ambiente automaticamente no Cloud Run
  const projectId = process.env.GCP_PROJECT_ID || (await client.getProjectId());
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');

  secretCache.set(secretName, payload);
  return payload;
}

module.exports = { getSecret };