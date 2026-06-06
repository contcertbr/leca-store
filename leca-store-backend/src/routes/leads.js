const express = require('express');
const router = express.Router();
const firestoreService = require('../services/firestoreService');
const { checkAuth } = require('../middleware/auth'); // Assumindo que o auth.js está em /middleware

router.post('/', async (req, res) => {
  const { name, email, message, source, productId } = req.body; // source: 'MercadoLivre', 'Instagram'
  if (!name || !email || !source) {
    return res.status(400).json({ error: 'Missing name, email or source' });
  }
  try {
    const leadId = await firestoreService.addLead({ name, email, message, source, productId });
    res.status(201).json({ message: 'Lead added successfully', leadId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', checkAuth, async (req, res) => { // <-- APLIQUE O MIDDLEWARE AQUI
  try {
    // Agora esta rota só pode ser acessada por usuários logados
    const leads = await firestoreService.getLeads();
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
