// Enviar emails sincronizados a Pro Agente (Base44)
async function sendEmailsToBase44(userId, emails) {
  const webhookUrl = process.env.BASE44_WEBHOOK_URL;
  const webhookSecret = process.env.BASE44_WEBHOOK_SECRET;
  
  if (!webhookUrl) {
    console.error('BASE44_WEBHOOK_URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret || '',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        type: 'email_sync',
        user_id: userId,
        emails: emails,
        synced_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Base44 webhook error:', response.status, errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending to Base44:', error.message);
    return { success: false, error: error.message };
  }
}

// Notificar a Base44 que un usuario conectó su Gmail
async function notifyGmailConnected(userId, userEmail, connectedGmailEmail) {
  const webhookUrl = process.env.BASE44_WEBHOOK_URL;
  const webhookSecret = process.env.BASE44_WEBHOOK_SECRET;
  
  if (!webhookUrl) {
    console.error('BASE44_WEBHOOK_URL not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret || '',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        type: 'gmail_connected',
        user_id: userId,
        gmail_email: connectedGmailEmail,
        connected_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Base44 webhook error:', response.status, errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error notifying Base44:', error.message);
    return { success: false, error: error.message };
  }
}

// Notificar a Base44 que un usuario desconectó su Gmail
async function notifyGmailDisconnected(userId) {
  const webhookUrl = process.env.BASE44_WEBHOOK_URL;
  const webhookSecret = process.env.BASE44_WEBHOOK_SECRET;
  
  if (!webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret || '',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        type: 'gmail_disconnected',
        user_id: userId,
        disconnected_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmailsToBase44,
  notifyGmailConnected,
  notifyGmailDisconnected
};
