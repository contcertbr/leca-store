const admin = require('firebase-admin');

const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Token não fornecido ou mal formatado');
      return res.status(403).send('Unauthorized');
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return res.status(403).send('Unauthorized');
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Adiciona informações do usuário à requisição
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(403).send('Unauthorized');
  }
};

module.exports = {
  checkAuth
};