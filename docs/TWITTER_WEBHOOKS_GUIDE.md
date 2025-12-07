# Twitter Webhooks - Guía Completa

Esta guía documenta todo lo aprendido durante la implementación de webhooks de Twitter para el proyecto XBOT.

## 📋 Tabla de Contenidos

1. [Conceptos Básicos](#conceptos-básicos)
2. [Arquitectura de Webhooks](#arquitectura-de-webhooks)
3. [Proceso de Registro](#proceso-de-registro)
4. [Autenticación](#autenticación)
5. [Estructura de Eventos](#estructura-de-eventos)
6. [Errores Comunes](#errores-comunes)
7. [Best Practices](#best-practices)

---

## Conceptos Básicos

### ¿Qué son los Webhooks de Twitter?

Los webhooks de Twitter (Account Activity API) permiten recibir eventos en tiempo real de cuentas de Twitter sin necesidad de polling.

**Diferencia con Filtered Stream:**
- **Account Activity API**: Eventos de UNA cuenta específica (tweets, mentions, DMs, likes, etc.)
- **Filtered Stream**: Tweets que coinciden con reglas/filtros (múltiples usuarios)

### Requisitos

1. **Nivel de API**: Enterprise o Pro ($5,000/mes mínimo)
2. **Permisos de App**:
   - ✅ Read
   - ✅ Write
   - ✅ **Direct Messages** (CRÍTICO - sin esto los webhooks no funcionan)
3. **Endpoint HTTPS**: Debe ser públicamente accesible
4. **Credenciales**:
   - API Key / API Secret (Consumer Keys)
   - Access Token / Access Secret (OAuth 1.0a)
   - Bearer Token (OAuth 2.0)

---

## Arquitectura de Webhooks

### Flujo Completo

```
1. REGISTRO
   └─> POST /2/webhooks
       ├─> Twitter valida endpoint (CRC Challenge)
       ├─> Devuelve webhook_id
       └─> Webhook creado ✓

2. SUSCRIPCIÓN
   └─> POST /2/account_activity/webhooks/:webhook_id/subscriptions/all
       ├─> Requiere OAuth 1.0a
       ├─> Suscribe la cuenta autenticada
       └─> Devuelve {"subscribed": true}

3. EVENTOS
   └─> Twitter envía POST a tu endpoint
       ├─> JSON con estructura específica
       ├─> Tu endpoint procesa
       └─> Responde 200 OK

4. VALIDACIÓN PERIÓDICA
   └─> Twitter envía GET con crc_token cada hora
       ├─> Tu endpoint calcula HMAC SHA-256
       ├─> Devuelve {"response_token": "sha256=..."}
       └─> Webhook sigue válido ✓
```

### Componentes Necesarios

```typescript
// 1. Endpoint de Webhook
app/api/webhooks/twitter/route.ts
├─> GET:  CRC Validation
└─> POST: Event Processing

// 2. Servicio de Gestión
lib/twitter/webhooks.ts
├─> registerWebhook()
├─> deleteWebhook()
├─> subscribeWebhook()
└─> unsubscribeWebhook()

// 3. Base de Datos
TwitterWebhookEvent (debugging/logging)
TwitterAccount.webhookId (tracking)
```

---

## Proceso de Registro

### Paso 1: Registrar Webhook

**Endpoint**: `POST https://api.twitter.com/2/webhooks`

**Autenticación**: Bearer Token (OAuth 2.0)

**Request**:
```json
{
  "url": "https://your-domain.com/api/webhooks/twitter"
}
```

**Response Success (200)**:
```json
{
  "data": {
    "created_at": "2025-12-07T17:00:01.000Z",
    "id": "1997712707928100864",
    "url": "https://your-domain.com/api/webhooks/twitter",
    "valid": true
  }
}
```

**Durante el registro, Twitter INMEDIATAMENTE hace**:
```
GET https://your-domain.com/api/webhooks/twitter?crc_token=xxx&nonce=yyy
```

Tu endpoint DEBE responder:
```json
{
  "response_token": "sha256=BASE64_HMAC_HASH"
}
```

### Paso 2: Calcular CRC Response Token

```typescript
import crypto from 'crypto';

const crcToken = request.nextUrl.searchParams.get('crc_token');
const consumerSecret = process.env.TWITTER_API_SECRET; // API Secret!

const hmac = crypto
  .createHmac('sha256', consumerSecret)
  .update(crcToken)
  .digest('base64');

const responseToken = `sha256=${hmac}`;

return NextResponse.json({ response_token: responseToken });
```

**⚠️ IMPORTANTE**: Usa `TWITTER_API_SECRET` (Consumer Secret), NO el Access Secret.

### Paso 3: Suscribir Cuenta

**Endpoint**: `POST https://api.twitter.com/2/account_activity/webhooks/:webhook_id/subscriptions/all`

**Autenticación**: OAuth 1.0a (Access Token + Access Secret)

**NO requiere body**

**Response Success (200)**:
```json
{
  "data": {
    "subscribed": true
  }
}
```

**La cuenta suscrita es la que corresponde al Access Token usado.**

---

## Autenticación

### OAuth 1.0a Signature (Para Suscripciones)

```typescript
function generateOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessSecret: string
): string {
  // 1. Parámetros OAuth
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(32).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // 2. Ordenar alfabéticamente
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');

  // 3. Signature Base String
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // 4. Signing Key
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

  // 5. Calcular Signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // 6. Authorization Header
  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
}
```

### Bearer Token (Para Registro de Webhooks)

Más simple:
```typescript
headers: {
  'Authorization': `Bearer ${bearerToken}`
}
```

---

## Estructura de Eventos

### Event: Tweet Mention

Cuando alguien menciona a la cuenta suscrita:

```json
{
  "for_user_id": "1460606890392629248",
  "user_has_blocked": false,
  "tweet_create_events": [
    {
      "id_str": "1234567890",
      "created_at": "Sat Dec 07 18:00:43 +0000 2025",
      "text": "Test @poapstudio with code ABC123",
      "user": {
        "id_str": "987654321",
        "screen_name": "gotoalberto",
        "name": "Alberto"
      },
      "entities": {
        "hashtags": [],
        "user_mentions": [
          {
            "screen_name": "poapstudio",
            "id_str": "1460606890392629248"
          }
        ],
        "media": [
          {
            "type": "photo",
            "media_url_https": "https://..."
          }
        ]
      }
    }
  ]
}
```

### Event: Like/Favorite

```json
{
  "for_user_id": "1460606890392629248",
  "favorite_events": [
    {
      "id": "...",
      "created_at": "...",
      "user": { ... },
      "favorited_status": { ... }
    }
  ]
}
```

### Event: Direct Message

```json
{
  "for_user_id": "1460606890392629248",
  "direct_message_events": [
    {
      "type": "message_create",
      "id": "...",
      "created_timestamp": "...",
      "message_create": {
        "sender_id": "...",
        "target": { "recipient_id": "..." },
        "message_data": {
          "text": "Hello!"
        }
      }
    }
  ]
}
```

---

## Errores Comunes

### 1. CRC Validation Failed

**Error**:
```json
{
  "errors": [{
    "message": "CrcValidationFailed: URL returned bad response during CRC with error: Invalid `response_token`"
  }]
}
```

**Causas**:
- Usando el secret incorrecto (debe ser TWITTER_API_SECRET, no ACCESS_SECRET)
- Endpoint no deployed con las credenciales correctas
- Error en el cálculo del HMAC

**Solución**:
1. Verificar que usas `TWITTER_API_SECRET`
2. Asegurarte de que el deployment tiene las nuevas credenciales
3. Verificar que el hash se calcula correctamente

### 2. Unauthorized (401)

**Error**:
```json
{
  "title": "Unauthorized",
  "status": 401
}
```

**Causas**:
- Credenciales OAuth 1.0a incorrectas o expiradas
- Permisos de app insuficientes
- Token regenerado pero no actualizado en el código

**Solución**:
1. Regenerar Access Token y Access Secret
2. Actualizar variables de entorno
3. Verificar permisos de app (Read + Write + Direct Messages)

### 3. Subscription Already Exists

**Error**:
```json
{
  "errors": [{
    "message": "DuplicateSubscriptionFailed: Subscription already exists"
  }]
}
```

**Causa**: La cuenta ya está suscrita a este webhook

**Solución**: Esto NO es un error - significa que la suscripción está activa ✓

### 4. No Events Received

**Síntomas**: Webhook registrado, suscripción exitosa, pero no llegan eventos

**Causas**:
- App no tiene permiso de "Direct Messages"
- Credenciales regeneradas sin el nuevo permiso
- Delay de hasta 10 segundos después de suscribirse

**Solución**:
1. Habilitar "Direct Messages" en app settings
2. Regenerar Access Token/Secret
3. Actualizar credenciales en producción
4. Eliminar y recrear webhook/suscripción
5. Esperar 10-15 segundos antes de probar

---

## Best Practices

### 1. Manejo de Credenciales

```typescript
// ✅ CORRECTO
const consumerSecret = process.env.TWITTER_API_SECRET;  // Para CRC
const accessToken = process.env.TWITTER_ACCESS_TOKEN;    // Para suscripciones
const accessSecret = process.env.TWITTER_ACCESS_SECRET;  // Para suscripciones
const bearerToken = process.env.TWITTER_BEARER_TOKEN;    // Para registro

// ❌ INCORRECTO
const secret = process.env.TWITTER_ACCESS_SECRET; // Para CRC - WRONG!
```

### 2. Logging de Eventos

```typescript
// Guardar TODOS los eventos para debugging
await prisma.twitterWebhookEvent.create({
  data: {
    method: 'POST',
    headers,
    body,
    eventType: detectedEventType,
    receivedAt: new Date()
  }
});
```

### 3. Response Time

```typescript
// Responder SIEMPRE 200 OK rápidamente
// Procesar en background si es necesario

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Guardar evento
    await prisma.twitterWebhookEvent.create({ data: { ... } });

    // Procesar asíncronamente (NO esperar)
    processEvent(body).catch(console.error);

    // Responder inmediatamente
    return NextResponse.json({ success: true });

  } catch (error) {
    // SIEMPRE responder 200 para evitar retries de Twitter
    return NextResponse.json({ success: false });
  }
}
```

### 4. Deduplicación

```typescript
// Twitter puede enviar eventos duplicados
// Usar ID del evento para deduplicar

const eventId = body.tweet_create_events?.[0]?.id_str;
if (!eventId) return;

const existing = await prisma.processedEvent.findUnique({
  where: { eventId }
});

if (existing) {
  console.log('Duplicate event, skipping');
  return;
}
```

### 5. Validación de Origen

```typescript
// Opcional: Validar que el request viene de Twitter
// Twitter envía signature en headers (verificar documentación)

const signature = request.headers.get('x-twitter-webhooks-signature');
// Verificar signature con tu consumer secret
```

---

## Scripts de Utilidad

### Registrar Webhook

```bash
npx tsx scripts/register-webhook.ts
```

### Suscribir Cuenta

```bash
npx tsx scripts/subscribe-webhook.ts
```

### Ver Eventos Capturados

```bash
npx tsx scripts/view-webhook-events.ts
```

### Verificar Cuenta Autenticada

```bash
npx tsx scripts/verify-auth-account.ts
```

---

## Limitaciones y Cuotas

### Enterprise Plan

- **Webhooks**: 5+ webhooks por app
- **Suscripciones**: Miles por webhook
- **Rate Limits**: Generosos para Enterprise

### Free/Basic/Pro

- **Account Activity API**: NO disponible
- Solo **Filtered Stream Webhooks** (diferente API)

---

## Troubleshooting Checklist

Cuando los webhooks no funcionan:

- [ ] ¿App tiene nivel Enterprise/Pro?
- [ ] ¿Permisos incluyen "Direct Messages"?
- [ ] ¿Access Token regenerado DESPUÉS de cambiar permisos?
- [ ] ¿Variables de entorno actualizadas en producción?
- [ ] ¿Endpoint HTTPS públicamente accesible?
- [ ] ¿CRC validation responde correctamente?
- [ ] ¿Webhook registrado (GET /2/webhooks muestra el webhook)?
- [ ] ¿Cuenta suscrita (POST /2/account_activity/.../subscriptions devuelve subscribed:true)?
- [ ] ¿Esperaste 10+ segundos después de suscribirse?
- [ ] ¿Probaste con una acción simple (like, tweet)?

---

## Referencias

- [Twitter Webhooks Docs](https://docs.x.com/x-api/webhooks/introduction)
- [Account Activity API](https://docs.x.com/x-api/account-activity/introduction)
- [CRC Validation](https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/guides/securing-webhooks)

---

**Última actualización**: 2025-12-07
**Autor**: Claude (documentado durante implementación XBOT)
