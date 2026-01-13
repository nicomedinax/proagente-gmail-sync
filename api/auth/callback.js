const { getTokensFromCode, getUserEmail } = require('../../lib/google');
const { saveUserTokens } = require('../../lib/database');
const { notifyGmailConnected } = require('../../lib/base44');

module.exports = async function handler(req, res) {
  // Solo permitir GET (Google redirige con GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code, state, error } = req.query;
  
  // Si Google devolvió un error
  if (error) {
    console.error('OAuth error from Google:', error);
    return res.redirect(`${process.env.PROAGENTE_APP_URL || ''}/settings?gmail_error=${error}`);
  }
  
  // Verificar que tenemos código y state
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }
  
  try {
    // Decodificar state
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const { userId, redirect } = decodedState;
    
    if (!userId) {
      return res.status(400).json({ error: 'Invalid state: missing userId' });
    }
    
    // Intercambiar código por tokens
    const tokens = await getTokensFromCode(code);
    
    // Obtener email del usuario de Gmail
    const gmailEmail = await getUserEmail(tokens);
    
    // Guardar tokens en Vercel KV
    await saveUserTokens(userId, tokens, gmailEmail);
    
    // Notificar a Base44 que el usuario conectó su Gmail
    await notifyGmailConnected(userId, userId, gmailEmail);
    
    console.log(`Gmail connected for user ${userId}: ${gmailEmail}`);
    
    // Redirigir de vuelta a Pro Agente con éxito
    const redirectUrl = redirect || process.env.PROAGENTE_APP_URL || '';
    res.redirect(`${redirectUrl}/settings?gmail_connected=true&email=${encodeURIComponent(gmailEmail)}`);
    
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const redirectUrl = process.env.PROAGENTE_APP_URL || '';
    res.redirect(`${redirectUrl}/settings?gmail_error=${encodeURIComponent(error.message)}`);
  }
};
