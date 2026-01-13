# ProAgente Gmail Sync

Servicio de sincronización de Gmail para Pro Agente CRM.

## 🚀 Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/proagente-gmail-sync.git
git push -u origin main
```

### 2. Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Importa el repositorio de GitHub
4. Vercel detectará automáticamente la configuración

### 3. Configurar Vercel KV (Base de datos)

1. En el dashboard de Vercel, ve a tu proyecto
2. Click en "Storage" en el menú lateral
3. Click en "Create Database"
4. Selecciona "KV" (Redis)
5. Nombre: `proagente-gmail-kv`
6. Click en "Create"
7. Vercel añadirá automáticamente las variables de entorno

### 4. Configurar Variables de Entorno

En Vercel, ve a Settings > Environment Variables y añade:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Del JSON descargado | `1234567890-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Del JSON descargado | `GOCSPX-xxxxxxxxxxxx` |
| `GOOGLE_REDIRECT_URI` | URL de callback | `https://tu-proyecto.vercel.app/api/auth/callback` |
| `BASE44_WEBHOOK_URL` | Webhook de tu app Base44 | `https://tu-app.base44.app/api/webhook/gmail` |
| `BASE44_WEBHOOK_SECRET` | Secret compartido | `tu-secret-seguro-aleatorio` |
| `PROAGENTE_APP_URL` | URL de tu app | `https://tu-app.base44.app` |
| `CRON_SECRET` | Para proteger el cron | `otro-secret-aleatorio` |

### 5. Actualizar URI de Redirección en Google Cloud

1. Ve a Google Cloud Console > APIs y servicios > Credenciales
2. Click en tu cliente OAuth
3. Añade tu URL de producción a "URIs de redirección autorizados":
   ```
   https://tu-proyecto.vercel.app/api/auth/callback
   ```

## 📡 Endpoints

### Autenticación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/gmail?userId=XXX` | GET | Inicia OAuth con Google |
| `/api/auth/callback` | GET | Callback de Google (automático) |
| `/api/auth/status?userId=XXX` | GET | Verifica si usuario está conectado |
| `/api/auth/disconnect` | POST | Desconecta Gmail de un usuario |

### Webhooks (llamados desde Base44)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/webhook/contacts` | POST | Actualiza lista de contactos |
| `/api/webhook/sync-now` | POST | Fuerza sincronización inmediata |

### Cron

| Endpoint | Frecuencia | Descripción |
|----------|------------|-------------|
| `/api/cron/sync-emails` | Cada 5 min | Sincroniza emails de todos los usuarios |

## 🔧 Uso desde Base44

### Conectar Gmail de un usuario

```javascript
// Redirigir al usuario para conectar Gmail
const userId = currentUser.id;
const gmailAuthUrl = `https://tu-proyecto.vercel.app/api/auth/gmail?userId=${userId}`;
window.location.href = gmailAuthUrl;
```

### Verificar estado de conexión

```javascript
const response = await fetch(
  `https://tu-proyecto.vercel.app/api/auth/status?userId=${userId}`
);
const { connected, email } = await response.json();
```

### Enviar lista de contactos

```javascript
await fetch('https://tu-proyecto.vercel.app/api/webhook/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': 'tu-secret'
  },
  body: JSON.stringify({
    userId: currentUser.id,
    contacts: [
      'jugador1@gmail.com',
      'jugador2@hotmail.com',
      'club@fcbarcelona.com'
    ]
  })
});
```

### Forzar sincronización

```javascript
await fetch('https://tu-proyecto.vercel.app/api/webhook/sync-now', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': 'tu-secret'
  },
  body: JSON.stringify({
    userId: currentUser.id,
    forceFullSync: false // true para re-sincronizar todo
  })
});
```

## 📧 Formato de emails enviados a Base44

Cuando se sincronizan emails, el webhook envía:

```json
{
  "type": "email_sync",
  "user_id": "user_123",
  "emails": [
    {
      "external_id": "18d4a5b6c7d8e9f0",
      "thread_id": "18d4a5b6c7d8e9f0",
      "contact_email": "jugador@gmail.com",
      "direction": "incoming",
      "from": "Jugador <jugador@gmail.com>",
      "to": "Agente <agente@gmail.com>",
      "subject": "Re: Propuesta del Valencia",
      "snippet": "Gracias por la info, lo hablo con mi familia...",
      "date": "2024-01-15T10:30:00.000Z",
      "gmail_link": "https://mail.google.com/mail/u/0/#inbox/18d4a5b6c7d8e9f0"
    }
  ],
  "synced_at": "2024-01-15T10:35:00.000Z"
}
```

## 🔒 Seguridad

- Los tokens de Gmail se almacenan en Vercel KV (Redis encriptado)
- Todas las comunicaciones usan HTTPS
- Los webhooks requieren `X-Webhook-Secret` header
- Solo se accede a emails en modo lectura (`gmail.readonly`)
- No se almacena el contenido completo de los emails, solo metadata

## 🐛 Troubleshooting

### "Access blocked: This app's request is invalid"
- Verifica que la URI de redirección en Google Cloud coincida exactamente con tu URL de Vercel

### "No contacts for user"
- Asegúrate de enviar la lista de contactos antes de sincronizar

### Los emails no se sincronizan
- Verifica que el cron esté activo en Vercel (Dashboard > Crons)
- Revisa los logs en Vercel para errores
