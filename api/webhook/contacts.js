const { saveUserContacts, getUserContacts } = require('../../lib/database');

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
  
  const { userId, contacts, action } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    if (action === 'get') {
      // Devolver contactos actuales
      const currentContacts = await getUserContacts(userId);
      return res.status(200).json({ contacts: currentContacts });
    }
    
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'contacts array is required' });
    }
    
    // Filtrar solo emails válidos y únicos
    const validEmails = [...new Set(
      contacts
        .filter(email => email && typeof email === 'string' && email.includes('@'))
        .map(email => email.toLowerCase().trim())
    )];
    
    // Guardar contactos
    await saveUserContacts(userId, validEmails);
    
    console.log(`Saved ${validEmails.length} contacts for user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: `Saved ${validEmails.length} contacts`,
      contacts_count: validEmails.length
    });
    
  } catch (error) {
    console.error('Error saving contacts:', error);
    res.status(500).json({ error: 'Failed to save contacts' });
  }
};
