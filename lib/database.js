const { kv } = require('@vercel/kv');

// Prefijos para las keys
const TOKENS_PREFIX = 'tokens:';
const CONTACTS_PREFIX = 'contacts:';
const SYNC_PREFIX = 'sync:';

// Guardar tokens de un usuario
async function saveUserTokens(userId, tokens, userEmail) {
  const data = {
    tokens,
    user_email: userEmail,
    connected_at: new Date().toISOString()
  };
  await kv.set(`${TOKENS_PREFIX}${userId}`, JSON.stringify(data));
}

// Obtener tokens de un usuario
async function getUserTokens(userId) {
  const data = await kv.get(`${TOKENS_PREFIX}${userId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// Eliminar tokens de un usuario
async function deleteUserTokens(userId) {
  await kv.del(`${TOKENS_PREFIX}${userId}`);
}

// Guardar lista de contactos de un usuario (emails de jugadores, clubes, etc.)
async function saveUserContacts(userId, contacts) {
  await kv.set(`${CONTACTS_PREFIX}${userId}`, JSON.stringify(contacts));
}

// Obtener lista de contactos de un usuario
async function getUserContacts(userId) {
  const data = await kv.get(`${CONTACTS_PREFIX}${userId}`);
  if (!data) return [];
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// Guardar timestamp de última sincronización
async function saveLastSync(userId) {
  await kv.set(`${SYNC_PREFIX}${userId}`, Date.now());
}

// Obtener timestamp de última sincronización
async function getLastSync(userId) {
  const timestamp = await kv.get(`${SYNC_PREFIX}${userId}`);
  return timestamp ? parseInt(timestamp) : null;
}

// Obtener todos los usuarios conectados (para el cron)
async function getAllConnectedUsers() {
  const keys = await kv.keys(`${TOKENS_PREFIX}*`);
  const users = [];
  
  for (const key of keys) {
    const userId = key.replace(TOKENS_PREFIX, '');
    const data = await getUserTokens(userId);
    if (data && data.tokens) {
      users.push({
        user_id: userId,
        ...data
      });
    }
  }
  
  return users;
}

// Verificar si un usuario está conectado
async function isUserConnected(userId) {
  const data = await getUserTokens(userId);
  return data !== null && data.tokens !== null;
}

module.exports = {
  saveUserTokens,
  getUserTokens,
  deleteUserTokens,
  saveUserContacts,
  getUserContacts,
  saveLastSync,
  getLastSync,
  getAllConnectedUsers,
  isUserConnected
};
