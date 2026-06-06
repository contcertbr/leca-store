const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carrega variáveis de ambiente do .env em desenvolvimento
const admin = require('firebase-admin');

const mercadolivreRoutes = require('./routes/mercadolivre');
const instagramRoutes = require('./routes/instagram');
const leadsRoutes = require('./routes/leads');

// Inicializa o Firebase Admin SDK
// Em um ambiente de produção como o Cloud Run, as credenciais são encontradas automaticamente.
admin.initializeApp({
    // Se você tiver um arquivo de credenciais para desenvolvimento local, pode especificá-lo aqui:
    // credential: admin.credential.cert(require('./path/to/your/serviceAccountKey.json'))
});

const app = express();
app.use(cors()); // Habilita CORS para o frontend
app.use(express.json()); // Habilita parsing de JSON no corpo das requisições

// Rotas da API
app.use('/api/mercadolivre', mercadolivreRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/leads', leadsRoutes);

// Rota de saúde
app.get('/', (req, res) => {
  res.status(200).send('Leca Store Backend is running!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});