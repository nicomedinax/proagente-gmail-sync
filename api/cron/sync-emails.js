const { getAllConnectedUsers, getUserContacts, getLastSync, saveLastSync, getUserTokens, saveUserTokens } = require('../../lib/database');
const { getEmails, refreshTokenIfNeeded } = require('../../lib/google');
const { sendEmailsToBase44 } = require('../../lib/base44');

module.exports = async function handler(req, res) {
  // Verificar que es una llamada del cron de Vercel o tiene autorización
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // En producción, Vercel envía un header especial para crons
  // También permitimos llamadas con el secret para testing
  if (authHeader !== `Bearer ${cronSecret}` && !req.headers['x-vercel-cron']) {
    // Permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  console.log('Starting email sync cron job...');
  
  try {
    // Obtener todos los usuarios conectados
    const connectedUsers = await getAllConnectedUsers();
    console.log(`Found ${connectedUsers.length} connected users`);
    
    const results = [];
    
    for (const user of connectedUsers) {
      const userId = user.user_id;
      
      try {
        // Refrescar token si es necesario
        const userData = await getUserTokens(userId);
        if (!userData || !userData.tokens) {
          console.log(`No tokens for user ${userId}, skipping`);
          continue;
        }
        
        const refreshedTokens = await refreshTokenIfNeeded(userData.tokens);
        
        // Si los tokens cambiaron, guardarlos
        if (refreshedTokens !== userData.tokens) {
          await saveUserTokens(userId, refreshedTokens, userData.user_email);
        }
        
        // Obtener contactos del usuario (emails de jugadores, clubes, sponsors)
        const contacts = await getUserContacts(userId);
        
        if (contacts.length === 0) {
          console.log(`No contacts for user ${userId}, skipping email fetch`);
          results.push({ userId, status: 'no_contacts' });
          continue;
        }
        
        // Obtener última sincronización
        const lastSync = await getLastSync(userId);
        
        // Obtener emails
        const emails = await getEmails(refreshedTokens, contacts, lastSync);
        console.log(`Found ${emails.length} emails for user ${userId}`);
        
        if (emails.length > 0) {
          // Enviar a Base44
          const sendResult = await sendEmailsToBase44(userId, emails);
          
          if (sendResult.success) {
            // Guardar timestamp de sincronización
            await saveLastSync(userId);
            results.push({ userId, status: 'success', emailCount: emails.length });
          } else {
            results.push({ userId, status: 'send_failed', error: sendResult.error });
          }
        } else {
          results.push({ userId, status: 'no_new_emails' });
        }
        
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError.message);
        results.push({ userId, status: 'error', error: userError.message });
      }
    }
    
    console.log('Email sync cron job completed', results);
    
    res.status(200).json({
      success: true,
      processed: connectedUsers.length,
      results
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Cron job failed', message: error.message });
  }
};
