const { getUserTokens, isUserConnected } = require('../../lib/database');

module.exports = async function handler(req, res) {
  // Permitir GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Obtener userId desde query o body
  const userId = req.method === 'GET' ? req.query.userId : req.body.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    const data = await getUserTokens(userId);
    
    if (data && data.tokens) {
      res.status(200).json({
        connected: true,
        email: data.user_email,
        connected_at: data.connected_at
      });
    } else {
      res.status(200).json({
        connected: false
      });
    }
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
};
