const { google } = require('googleapis');

// Crear cliente OAuth2
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Generar URL de autorización
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: userId // Pasamos el userId de Base44 para asociar después
  });
}

// Intercambiar código por tokens
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Crear cliente autenticado con tokens
function getAuthenticatedClient(tokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Refrescar token si es necesario
async function refreshTokenIfNeeded(tokens) {
  const oauth2Client = getAuthenticatedClient(tokens);
  
  // Si el token expira en menos de 5 minutos, refrescarlo
  const expiryDate = tokens.expiry_date;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (expiryDate && (expiryDate - now) < fiveMinutes) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  }
  
  return tokens;
}

// Obtener información del usuario (email)
async function getUserEmail(tokens) {
  const oauth2Client = getAuthenticatedClient(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

// Obtener emails de Gmail
async function getEmails(tokens, contactEmails, lastSyncTime = null) {
  const oauth2Client = getAuthenticatedClient(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const emails = [];
  
  for (const contactEmail of contactEmails) {
    try {
      // Construir query para buscar emails de/para este contacto
      let query = `from:${contactEmail} OR to:${contactEmail}`;
      
      // Si hay lastSyncTime, solo traer emails nuevos
      if (lastSyncTime) {
        const afterDate = Math.floor(lastSyncTime / 1000);
        query += ` after:${afterDate}`;
      }
      
      // Buscar mensajes
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50 // Limitar para no sobrecargar
      });
      
      const messages = listResponse.data.messages || [];
      
      // Obtener detalles de cada mensaje
      for (const message of messages) {
        try {
          const msgResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });
          
          const headers = msgResponse.data.payload.headers;
          const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
          };
          
          const from = getHeader('From');
          const to = getHeader('To');
          const subject = getHeader('Subject');
          const date = getHeader('Date');
          
          // Determinar dirección (entrante o saliente)
          const isIncoming = from.toLowerCase().includes(contactEmail.toLowerCase());
          
          // Obtener snippet (preview del contenido)
          const snippet = msgResponse.data.snippet || '';
          
          emails.push({
            external_id: message.id,
            thread_id: msgResponse.data.threadId,
            contact_email: contactEmail,
            direction: isIncoming ? 'incoming' : 'outgoing',
            from: from,
            to: to,
            subject: subject,
            snippet: snippet,
            date: new Date(date).toISOString(),
            gmail_link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`
          });
        } catch (msgError) {
          console.error(`Error fetching message ${message.id}:`, msgError.message);
        }
      }
    } catch (searchError) {
      console.error(`Error searching emails for ${contactEmail}:`, searchError.message);
    }
  }
  
  // Ordenar por fecha descendente
  emails.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return emails;
}

module.exports = {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  refreshTokenIfNeeded,
  getUserEmail,
  getEmails
};
