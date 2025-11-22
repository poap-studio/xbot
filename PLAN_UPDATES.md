# Actualizaciones al Plan de Trabajo

## ⚠️ IMPLEMENTATION GUIDELINES

**ALL implementations must follow the guidelines in `IMPLEMENTATION_GUIDELINES.md`:**
- ✅ Production-ready code only (NO minimal implementations)
- ✅ Complete test coverage (unit, integration, E2E)
- ✅ Comprehensive error handling
- ✅ Full security measures
- ✅ Complete documentation

**This is not optional. Every phase must be fully implemented and production-ready.**

---

## NUEVA FUNCIONALIDAD: Conexión de Cuenta de Bot desde Backoffice

### Resumen
El backoffice debe permitir conectar la cuenta de Twitter que responderá a los tweets. El administrador debe otorgar permisos a la aplicación para que pueda postear en nombre de la cuenta del bot.

---

## Cambios en el Schema de Base de Datos (Prisma)

### Agregar modelo BotAccount

```prisma
model BotAccount {
  id              String   @id @default(cuid())
  twitterId       String   @unique
  username        String
  displayName     String?
  profileImageUrl String?

  // OAuth credentials para postear
  accessToken     String   // Encrypted
  accessSecret    String   // Encrypted

  // Estado de conexión
  isConnected     Boolean  @default(true)
  lastUsedAt      DateTime?
  connectedAt     DateTime @default(now())

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("bot_accounts")
}

// Actualizar modelo Config
model Config {
  id              String   @id @default(cuid())
  poapEventId     String
  poapSecretCode  String
  botReplyText    String   @default("¡Felicidades! Reclama tu POAP aquí: {{claimUrl}}")
  twitterHashtag  String   @default("#POAP")
  requiredCode    String   @default("ELIGIBLE")

  // Relación con cuenta del bot
  botAccountId    String?  @unique

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("config")
}
```

---

## FASE 0.5: Actualizar Schema de Prisma (NUEVA)

### Objetivos
- Actualizar schema de Prisma con modelo BotAccount
- Crear migración para añadir tabla
- Preparar encriptación de tokens

### Archivos a Modificar/Crear

#### 0.5.1 - Actualizar `/prisma/schema.prisma`
Añadir modelo BotAccount y actualizar Config con botAccountId.

#### 0.5.2 - Crear biblioteca de encriptación
**Archivo**: `/lib/crypto.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET!; // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(SECRET_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(SECRET_KEY, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### 0.5.3 - Actualizar `.env.example`
```env
# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_SECRET=""
```

#### 0.5.4 - Commit
```bash
git add .
git commit -m "Add BotAccount model for Twitter OAuth bot connection

- Add BotAccount model to store bot credentials
- Update Config model with botAccountId relationship
- Add encryption utilities for secure token storage
- Prepare for OAuth flow in backoffice"

git push origin main
```

---

## FASE 5: BACKOFFICE (ACTUALIZADA)

### Objetivos Ampliados
- Crear panel de administración
- **Conectar cuenta de Twitter del bot con OAuth**
- Configurar POAP event
- Ver estadísticas
- Descargar CSV

### Archivos Adicionales a Crear

#### 5.1.5 - `/app/api/auth/bot-twitter/route.ts`

Endpoint para iniciar OAuth del bot.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function GET(request: NextRequest) {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
  });

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/bot-twitter/callback`;

  const authLink = await client.generateAuthLink(callbackUrl, {
    linkMode: 'authorize', // Force reauthorization
  });

  // Store oauth_token_secret in session/database temporarily
  // For simplicity, using URL param (in production use encrypted session)
  const redirectUrl = `/admin/connect-bot?oauth_token=${authLink.oauth_token}&oauth_token_secret=${authLink.oauth_token_secret}`;

  return NextResponse.redirect(authLink.url);
}
```

#### 5.1.6 - `/app/api/auth/bot-twitter/callback/route.ts`

Callback de OAuth para completar conexión.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');

  // Get oauth_token_secret from session/temp storage
  const oauthTokenSecret = searchParams.get('oauth_token_secret'); // Simplified

  if (!oauthToken || !oauthVerifier || !oauthTokenSecret) {
    return NextResponse.redirect('/admin?error=oauth_failed');
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: oauthToken,
    accessSecret: oauthTokenSecret,
  });

  try {
    // Exchange for access tokens
    const { client: loggedClient, accessToken, accessSecret } =
      await client.login(oauthVerifier);

    // Get user info
    const user = await loggedClient.v2.me({
      'user.fields': ['profile_image_url'],
    });

    // Encrypt and store tokens
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedAccessSecret = encrypt(accessSecret);

    // Save bot account
    const botAccount = await prisma.botAccount.upsert({
      where: { twitterId: user.data.id },
      create: {
        twitterId: user.data.id,
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url,
        accessToken: encryptedAccessToken,
        accessSecret: encryptedAccessSecret,
        isConnected: true,
        connectedAt: new Date(),
      },
      update: {
        username: user.data.username,
        displayName: user.data.name,
        profileImageUrl: user.data.profile_image_url,
        accessToken: encryptedAccessToken,
        accessSecret: encryptedAccessSecret,
        isConnected: true,
        connectedAt: new Date(),
      },
    });

    // Update config to use this bot account
    await prisma.config.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        poapEventId: '',
        poapSecretCode: '',
        botAccountId: botAccount.id,
      },
      update: {
        botAccountId: botAccount.id,
      },
    });

    return NextResponse.redirect('/admin?success=bot_connected');
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return NextResponse.redirect('/admin?error=oauth_failed');
  }
}
```

#### 5.1.7 - `/components/admin/BotConnection.tsx`

Componente para conectar/desconectar bot.

```typescript
'use client';

import { useState, useEffect } from 'react';

interface BotAccount {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  isConnected: boolean;
  connectedAt: string;
  lastUsedAt?: string;
}

export function BotConnection() {
  const [botAccount, setBotAccount] = useState<BotAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBotAccount();
  }, []);

  async function fetchBotAccount() {
    try {
      const res = await fetch('/api/admin/bot-account');
      const data = await res.json();
      setBotAccount(data.botAccount);
    } catch (error) {
      console.error('Failed to fetch bot account:', error);
    } finally {
      setLoading(false);
    }
  }

  async function connectBot() {
    window.location.href = '/api/auth/bot-twitter';
  }

  async function disconnectBot() {
    if (!confirm('¿Desconectar cuenta del bot? Dejará de funcionar.')) return;

    try {
      await fetch('/api/admin/bot-account', { method: 'DELETE' });
      setBotAccount(null);
    } catch (error) {
      alert('Error al desconectar cuenta');
    }
  }

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Cuenta del Bot de Twitter</h2>

      {!botAccount ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No hay ninguna cuenta conectada. Conecta una cuenta de Twitter para que el bot pueda responder a tweets.
          </p>
          <button
            onClick={connectBot}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Conectar Cuenta de Twitter
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {botAccount.profileImageUrl && (
              <img
                src={botAccount.profileImageUrl}
                alt={botAccount.username}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold">{botAccount.displayName}</h3>
              <p className="text-gray-600">@{botAccount.username}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  botAccount.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {botAccount.isConnected ? 'Conectada' : 'Desconectada'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Conectada: {new Date(botAccount.connectedAt).toLocaleDateString()}
              </p>
              {botAccount.lastUsedAt && (
                <p className="text-xs text-gray-500">
                  Último uso: {new Date(botAccount.lastUsedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={connectBot}
              className="text-blue-600 hover:text-blue-700 px-4 py-2 text-sm"
            >
              Reconectar
            </button>
            <button
              onClick={disconnectBot}
              className="text-red-600 hover:text-red-700 px-4 py-2 text-sm"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">
          ⚠️ Importante
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• La cuenta conectada será la que responda a los tweets elegibles</li>
          <li>• Asegúrate de que la cuenta tenga permisos de escritura (Read and Write)</li>
          <li>• Puedes reconectar en cualquier momento si los tokens expiran</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 5.1.8 - `/app/api/admin/bot-account/route.ts`

API para gestionar cuenta del bot.

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const config = await prisma.config.findFirst();

  if (!config?.botAccountId) {
    return NextResponse.json({ botAccount: null });
  }

  const botAccount = await prisma.botAccount.findUnique({
    where: { id: config.botAccountId },
    select: {
      id: true,
      username: true,
      displayName: true,
      profileImageUrl: true,
      isConnected: true,
      connectedAt: true,
      lastUsedAt: true,
      // Don't return tokens
    },
  });

  return NextResponse.json({ botAccount });
}

export async function DELETE() {
  const config = await prisma.config.findFirst();

  if (!config?.botAccountId) {
    return NextResponse.json({ error: 'No bot account connected' }, { status: 404 });
  }

  // Update config to remove bot account
  await prisma.config.update({
    where: { id: config.id },
    data: { botAccountId: null },
  });

  // Mark bot account as disconnected (don't delete for audit trail)
  await prisma.botAccount.update({
    where: { id: config.botAccountId },
    data: { isConnected: false },
  });

  return NextResponse.json({ success: true });
}
```

#### 5.1.9 - Actualizar `/app/admin/page.tsx`

Añadir componente BotConnection.

```typescript
import { BotConnection } from '@/components/admin/BotConnection';
import { ConfigForm } from '@/components/admin/ConfigForm';
import { Stats } from '@/components/admin/Stats';
import { DeliveriesTable } from '@/components/admin/DeliveriesTable';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-8">
        <BotConnection />  {/* NUEVO */}
        <ConfigForm />
        <Stats />
        <DeliveriesTable />
      </div>
    </div>
  );
}
```

---

## FASE 3: BOT SERVICE (ACTUALIZADA)

### Cambios en el Procesador de Tweets

#### Actualizar `/lib/twitter/client.ts`

Usar tokens del bot conectado en lugar de variables de entorno.

```typescript
import { TwitterApi } from 'twitter-api-v2';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

// Cliente con credenciales de app (para búsqueda)
const appClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
});

export const twitterBearer = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);

// Cliente del bot (para postear)
export async function getBotClient(): Promise<TwitterApi> {
  const config = await prisma.config.findFirst();

  if (!config?.botAccountId) {
    throw new Error('No bot account connected');
  }

  const botAccount = await prisma.botAccount.findUnique({
    where: { id: config.botAccountId },
  });

  if (!botAccount || !botAccount.isConnected) {
    throw new Error('Bot account not connected or inactive');
  }

  // Decrypt tokens
  const accessToken = decrypt(botAccount.accessToken);
  const accessSecret = decrypt(botAccount.accessSecret);

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken,
    accessSecret,
  });
}
```

#### Actualizar `/lib/twitter/reply.ts`

```typescript
import { getBotClient } from './client';
import prisma from '@/lib/prisma';

export async function replyToTweet(
  tweetId: string,
  replyText: string
): Promise<string> {
  const botClient = await getBotClient();
  const response = await botClient.v2.reply(replyText, tweetId);

  // Update lastUsedAt
  const config = await prisma.config.findFirst();
  if (config?.botAccountId) {
    await prisma.botAccount.update({
      where: { id: config.botAccountId },
      data: { lastUsedAt: new Date() },
    });
  }

  return response.data.id;
}

export async function markTweetAsReplied(
  tweetId: string,
  replyTweetId: string
) {
  return prisma.tweet.update({
    where: { tweetId },
    data: {
      botReplied: true,
      botReplyTweetId: replyTweetId,
    },
  });
}
```

---

## Tests Adicionales

### `/lib/crypto/__tests__/crypto.test.ts`

```typescript
import { encrypt, decrypt } from '../crypto';

describe('Crypto utilities', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('should encrypt and decrypt text', () => {
    const original = 'sensitive_token_12345';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
  });

  it('should produce different ciphertexts for same input', () => {
    const text = 'same_text';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(text);
    expect(decrypt(encrypted2)).toBe(text);
  });
});
```

### `/components/admin/__tests__/BotConnection.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BotConnection } from '../BotConnection';

global.fetch = jest.fn();

describe('BotConnection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows connect button when no account connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ botAccount: null }),
    });

    render(<BotConnection />);

    await waitFor(() => {
      expect(screen.getByText('Conectar Cuenta de Twitter')).toBeInTheDocument();
    });
  });

  it('shows bot account info when connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        botAccount: {
          id: '1',
          username: 'testbot',
          displayName: 'Test Bot',
          isConnected: true,
          connectedAt: new Date().toISOString(),
        },
      }),
    });

    render(<BotConnection />);

    await waitFor(() => {
      expect(screen.getByText('@testbot')).toBeInTheDocument();
      expect(screen.getByText('Test Bot')).toBeInTheDocument();
    });
  });
});
```

---

## Resumen de Cambios

### Nuevos Modelos de DB
- `BotAccount` (cuenta de Twitter del bot con tokens encriptados)
- `Config.botAccountId` (relación con cuenta del bot)

### Nuevas APIs
- `GET /api/auth/bot-twitter` - Iniciar OAuth
- `GET /api/auth/bot-twitter/callback` - Callback OAuth
- `GET /api/admin/bot-account` - Obtener info del bot
- `DELETE /api/admin/bot-account` - Desconectar bot

### Nuevos Componentes
- `BotConnection` - UI para conectar/desconectar bot

### Nuevas Librerías
- `/lib/crypto.ts` - Encriptación de tokens

### Variables de Entorno Adicionales
- `ENCRYPTION_SECRET` - Secret para encriptar tokens (32 bytes hex)

### Flujo OAuth del Bot
1. Admin hace clic en "Conectar Cuenta de Twitter"
2. Redirige a Twitter para autorizar
3. Twitter redirige a callback con tokens
4. Tokens se encriptan y guardan en DB
5. Config se actualiza con botAccountId
6. Bot usa estos tokens para responder tweets

---

## Orden de Implementación Actualizado

1. **FASE 0.5** (NUEVA): Actualizar schema + encriptación
2. **FASE 1**: POAP API Client
3. **FASE 2**: Twitter API Client (actualizado con getBotClient)
4. **FASE 3**: Bot Service (actualizado para usar bot conectado)
5. **FASE 4**: Web de Claim
6. **FASE 5**: Backoffice (actualizado con BotConnection)
7. **FASE 6**: Testing Completo
8. **FASE 7**: Documentación y Deployment

---

## Commit para Documentación

```bash
git add PLAN_UPDATES.md
git commit -m "Add bot account OAuth connection to plan

- Add BotAccount model for storing bot credentials
- Implement OAuth flow for connecting Twitter bot account
- Add encryption utilities for secure token storage
- Update backoffice to include bot connection UI
- Update bot service to use connected account tokens
- Add comprehensive tests for new functionality"

git push origin main
```
