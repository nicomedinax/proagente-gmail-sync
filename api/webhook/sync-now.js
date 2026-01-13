const { getUserTokens, getUserContacts, getLastSync, saveLastSync, saveUserTokens } = require('../../lib/database');
const { getEmails, refreshTokenIfNeeded } = require('../../lib/google');
const { sendEmailsToBase44 } = require('../../lib/base44');

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
  
  const { userId, forceFullSync } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    // Obtener tokens del usuario
    const userData = await getUserTokens(userId);
    
    if (!userData || !userData.tokens) {
      return res.status(400).json({ error: 'User not connected to Gmail' });
    }
    
    // Refrescar token si es necesario
    const refreshedTokens = await refreshTokenIfNeeded(userData.tokens);
    
    if (refreshedTokens !== userData.tokens) {
      await saveUserTokens(userId, refreshedTokens, userData.user_email);
    }
    
    // Obtener contactos del usuario
    const contacts = await getUserContacts(userId);
    
    if (contacts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No contacts to sync',
        emails_found: 0
      });
    }
    
    // Obtener última sincronización (null si es forceFullSync)
    const lastSync = forceFullSync ? null : await getLastSync(userId);
    
    // Obtener emails
    const emails = await getEmails(refreshedTokens, contacts, lastSync);
    
    if (emails.length > 0) {
      // Enviar a Base44
      const sendResult = await sendEmailsToBase44(userId, emails);
      
      if (sendResult.success) {
        await saveLastSync(userId);
        
        return res.status(200).json({
          success: true,
          message: `Synced ${emails.length} emails`,
          emails_found: emails.length
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to send emails to Base44',
          details: sendResult.error
        });
      }
    } else {
      return res.status(200).json({
        success: true,
        message: 'No new emails found',
        emails_found: 0
      });
    }
    
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
};
