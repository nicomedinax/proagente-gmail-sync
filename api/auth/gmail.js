const { getAuthUrl } = require('../../lib/google');

module.exports = async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Obtener userId desde query params (viene de Base44)
  const { userId, redirect } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    // Guardar la URL de redirección en el state junto con el userId
    const state = JSON.stringify({
      userId,
      redirect: redirect || process.env.PROAGENTE_APP_URL || 'https://app.proagente.com'
    });
    
    // Codificar state en base64 para evitar problemas con caracteres especiales
    const encodedState = Buffer.from(state).toString('base64');
    
    // Generar URL de autorización de Google
    const authUrl = getAuthUrl(encodedState);
    
    // Redirigir al usuario a Google
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
};
