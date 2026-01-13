const { deleteUserTokens } = require('../../lib/database');
const { notifyGmailDisconnected } = require('../../lib/base44');

module.exports = async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verificar secret para seguridad
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.BASE44_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    // Eliminar tokens del usuario
    await deleteUserTokens(userId);
    
    // Notificar a Base44
    await notifyGmailDisconnected(userId);
    
    console.log(`Gmail disconnected for user ${userId}`);
    
    res.status(200).json({ success: true, message: 'Gmail disconnected' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
};
