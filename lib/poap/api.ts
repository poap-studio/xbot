/**
 * POAP API Client
 * Manages mint links, claims, and POAP distribution
 */

import { getValidToken } from './auth';
import prisma from '@/lib/prisma';

const POAP_API_BASE = 'https://api.poap.tech';

interface PoapApiError {
  statusCode: number;
  message: string;
  error?: string;
}

interface MintLink {
  qr_hash: string;
  url: string;
  claimed: boolean;
  secret?: string;
}

interface QRCodeResponse {
  qr_hash: string;
  claimed: boolean;
  secret?: string;
  event?: {
    id: number;
    name: string;
    description: string;
    image_url: string;
  };
  beneficiary?: string;
}

interface ClaimResponse {
  id: number;
  qr_hash: string;
  tx_hash?: string;
  event_id: number;
  beneficiary: string;
  user_input?: string;
  signer: string;
  claimed: boolean;
  claimed_date: string;
  created_date: string;
}

interface PoapEvent {
  id: number;
  fancy_id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  event_url: string;
  image_url: string;
  animation_url?: string;
  year: number;
  start_date: string;
  end_date: string;
  expiry_date: string;
  supply: number;
}

/**
 * Make authenticated request to POAP API
 * @template T
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<T>} Parsed response
 * @throws {Error} If request fails
 */
async function poapRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getValidToken();

  const url = `${POAP_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `POAP API error: ${response.status} ${response.statusText}`;

    try {
      const errorData: PoapApiError = await response.json();
      errorMessage = `POAP API error (${errorData.statusCode}): ${errorData.message}`;
      if (errorData.error) {
        errorMessage += ` - ${errorData.error}`;
      }
    } catch {
      // If parsing JSON fails, use the basic error message
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get mint links for a specific POAP event
 * @param {string} eventId - POAP event ID
 * @param {string} secretCode - Secret code for the event
 * @returns {Promise<MintLink[]>} Array of mint links
 * @throws {Error} If request fails
 */
export async function getMintLinks(
  eventId: string,
  secretCode: string
): Promise<MintLink[]> {
  try {
    const response = await poapRequest<MintLink[]>(
      `/event/${eventId}/qr-codes`,
      {
        method: 'POST',
        body: JSON.stringify({ secret_code: secretCode }),
      }
    );

    console.log(`Retrieved ${response.length} mint links for event ${eventId}`);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get mint links: ${error.message}`);
    }
    throw new Error('Failed to get mint links: Unknown error');
  }
}

/**
 * Get information about a specific QR code / mint link
 * @param {string} qrHash - QR hash from the mint link
 * @returns {Promise<QRCodeResponse>} QR code information
 * @throws {Error} If request fails
 */
export async function getQRCodeInfo(qrHash: string): Promise<QRCodeResponse> {
  try {
    const response = await poapRequest<QRCodeResponse>(
      `/actions/claim-qr?qr_hash=${qrHash}`,
      { method: 'GET' }
    );

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get QR code info: ${error.message}`);
    }
    throw new Error('Failed to get QR code info: Unknown error');
  }
}

/**
 * Get POAP event details by event ID
 * @param {string} eventId - POAP event ID
 * @returns {Promise<PoapEvent>} Event information including image_url
 * @throws {Error} If request fails
 */
export async function getPoapEventById(eventId: string): Promise<PoapEvent> {
  try {
    const response = await poapRequest<PoapEvent>(
      `/events/id/${eventId}`,
      { method: 'GET' }
    );

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get POAP event: ${error.message}`);
    }
    throw new Error('Failed to get POAP event: Unknown error');
  }
}

/**
 * Claim a POAP using a mint link
 * @param {string} qrHash - QR hash from the mint link
 * @param {string} secret - Secret code for this specific mint link
 * @param {string} address - Ethereum address or email to mint to
 * @param {boolean} isEmail - Whether the address is an email (default: false)
 * @returns {Promise<ClaimResponse>} Claim response
 * @throws {Error} If claim fails
 */
export async function claimPOAP(
  qrHash: string,
  secret: string,
  address: string,
  isEmail: boolean = false
): Promise<ClaimResponse> {
  try {
    const body: any = {
      qr_hash: qrHash,
      secret: secret,
    };

    if (isEmail) {
      body.email = address;
    } else {
      body.address = address;
    }

    const response = await poapRequest<ClaimResponse>('/actions/claim-qr', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log(`POAP claimed successfully for ${address} (qr_hash: ${qrHash})`);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to claim POAP: ${error.message}`);
    }
    throw new Error('Failed to claim POAP: Unknown error');
  }
}

/**
 * Import mint links into database
 * Fetches mint links from POAP API and stores them in the database
 * @param {string} eventId - POAP event ID
 * @param {string} secretCode - Secret code for the event
 * @returns {Promise<number>} Number of mint links imported
 * @throws {Error} If import fails
 */
export async function importMintLinks(
  eventId: string,
  secretCode: string
): Promise<number> {
  try {
    console.log(`Importing mint links for event ${eventId}...`);

    const mintLinks = await getMintLinks(eventId, secretCode);

    if (mintLinks.length === 0) {
      throw new Error('No mint links found for this event');
    }

    // Import mint links into database
    let imported = 0;
    for (const link of mintLinks) {
      try {
        await prisma.qRCode.upsert({
          where: { qrHash: link.qr_hash },
          create: {
            qrHash: link.qr_hash,
            mintLink: link.url,
            claimed: link.claimed,
            secret: link.secret,
          },
          update: {
            claimed: link.claimed,
            secret: link.secret,
          },
        });
        imported++;
      } catch (error) {
        console.error(`Failed to import mint link ${link.qr_hash}:`, error);
      }
    }

    console.log(`Successfully imported ${imported}/${mintLinks.length} mint links`);
    return imported;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import mint links: ${error.message}`);
    }
    throw new Error('Failed to import mint links: Unknown error');
  }
}

/**
 * Get an available (unclaimed, unreserved) mint link from database
 * @returns {Promise<string | null>} Mint link or null if none available
 */
export async function getAvailableMintLink(): Promise<string | null> {
  const qrCode = await prisma.qRCode.findFirst({
    where: {
      claimed: false,
      reservedFor: null,
    },
    orderBy: {
      createdAt: 'asc', // FIFO
    },
  });

  return qrCode?.mintLink || null;
}

/**
 * Reserve a mint link for a specific Twitter user
 * @param {string} twitterId - Twitter user ID
 * @returns {Promise<string | null>} Reserved mint link or null if none available
 */
export async function reserveMintLink(twitterId: string): Promise<string | null> {
  try {
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        claimed: false,
        reservedFor: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!qrCode) {
      console.warn('No available mint links to reserve');
      return null;
    }

    // Reserve it
    await prisma.qRCode.update({
      where: { id: qrCode.id },
      data: {
        reservedFor: twitterId,
        reservedAt: new Date(),
      },
    });

    console.log(`Mint link reserved for user ${twitterId}: ${qrCode.mintLink}`);
    return qrCode.mintLink;
  } catch (error) {
    console.error('Failed to reserve mint link:', error);
    return null;
  }
}

/**
 * Mark a mint link as claimed
 * @param {string} qrHash - QR hash of the mint link
 * @param {string} claimedBy - Ethereum address or email that claimed it
 */
export async function markMintLinkClaimed(
  qrHash: string,
  claimedBy: string
): Promise<void> {
  try {
    await prisma.qRCode.update({
      where: { qrHash },
      data: {
        claimed: true,
        claimedBy,
        claimedAt: new Date(),
      },
    });

    console.log(`Mint link ${qrHash} marked as claimed by ${claimedBy}`);
  } catch (error) {
    console.error(`Failed to mark mint link ${qrHash} as claimed:`, error);
    throw error;
  }
}

/**
 * Get count of available mint links
 * @returns {Promise<number>} Number of available mint links
 */
export async function getAvailableMintLinksCount(): Promise<number> {
  return prisma.qRCode.count({
    where: {
      claimed: false,
      reservedFor: null,
    },
  });
}

/**
 * Get count of total mint links
 * @returns {Promise<number>} Total number of mint links
 */
export async function getTotalMintLinksCount(): Promise<number> {
  return prisma.qRCode.count();
}

/**
 * Get statistics about mint links
 * @returns {Promise<object>} Statistics object
 */
export async function getMintLinkStats(): Promise<{
  total: number;
  available: number;
  reserved: number;
  claimed: number;
}> {
  const [total, available, reserved, claimed] = await Promise.all([
    getTotalMintLinksCount(),
    getAvailableMintLinksCount(),
    prisma.qRCode.count({
      where: {
        claimed: false,
        reservedFor: { not: null },
      },
    }),
    prisma.qRCode.count({
      where: { claimed: true },
    }),
  ]);

  return { total, available, reserved, claimed };
}

/**
 * Get all QR codes for an event using Event ID and Edit Code
 * This endpoint requires OAuth2 Bearer token authentication
 * Documentation: https://documentation.poap.tech/reference/posteventqr-codes
 * @param {string} eventId - POAP event ID
 * @param {string} editCode - Edit code (secret_code) for the event (6 digit code)
 * @returns {Promise<Array>} Array of QR code hashes
 */
/**
 * Internal function to make QR codes request
 */
async function makeQRCodesRequest(
  eventId: string,
  editCode: string,
  token: string,
  apiKey: string
): Promise<Response> {
  const url = `${POAP_API_BASE}/event/${eventId}/qr-codes`;

  return await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      secret_code: editCode,
    }),
  });
}

export async function getEventQRCodes(
  eventId: string,
  editCode: string,
  retryOnAuth: boolean = true
): Promise<string[]> {
  console.log(`[POAP API] Getting QR codes for event ${eventId}...`);

  // This endpoint requires OAuth2 Bearer token
  const token = await getValidToken();
  const apiKey = (process.env.POAP_API_KEY || '').trim();

  console.log(`[POAP API] Token length: ${token?.length || 0}`);
  console.log(`[POAP API] API Key length: ${apiKey?.length || 0}`);
  console.log(`[POAP API] Edit code: ${editCode}`);

  const response = await makeQRCodesRequest(eventId, editCode, token, apiKey);

  if (!response.ok) {
    const errorText = await response.text();

    console.error(`[POAP API] Request failed: ${response.status}`);
    console.error(`[POAP API] Error response: ${errorText}`);

    // If we get 401/403 and haven't retried yet, refresh token and retry
    if ((response.status === 401 || response.status === 403) && retryOnAuth) {
      console.log('[POAP API] Authentication failed, refreshing token and retrying...');

      // Clear current token from database
      await prisma.poapAuth.deleteMany({});

      // Get new token
      const newToken = await getValidToken();
      console.log(`[POAP API] New token obtained, length: ${newToken?.length || 0}`);

      // Retry request with new token (retryOnAuth = false to prevent infinite loop)
      return await getEventQRCodes(eventId, editCode, false);
    }

    // Provide helpful error messages
    if (response.status === 400 && errorText.includes('Invalid edit code')) {
      throw new Error(
        `Invalid edit code for event ${eventId}. Please verify the edit code is correct.`
      );
    }

    if (response.status === 403) {
      throw new Error(
        `Access denied to event ${eventId}. Verify the event exists and you have permissions.`
      );
    }

    throw new Error(
      `Failed to fetch QR codes from POAP: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log(`[POAP API] Successfully retrieved ${data.length} QR codes`);

  // The API returns an array of objects with qr_hash property
  return data.map((item: any) => item.qr_hash);
}

/**
 * Internal function to make claim secret request
 */
async function makeClaimSecretRequest(
  qrHash: string,
  token: string,
  apiKey: string
): Promise<Response> {
  const url = `${POAP_API_BASE}/actions/claim-qr?qr_hash=${qrHash}`;

  return await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
    },
  });
}

/**
 * Get claim secret for a QR hash
 * This endpoint requires OAuth2 Bearer token authentication
 * Documentation: https://documentation.poap.tech/reference/getactionsclaim-qr
 * @param {string} qrHash - QR hash
 * @param {boolean} retryOnAuth - Whether to retry on auth failure (default: true)
 * @returns {Promise<string>} Secret for claiming the POAP
 */
export async function getClaimSecret(
  qrHash: string,
  retryOnAuth: boolean = true
): Promise<string> {
  console.log(`[POAP API] Getting secret for QR hash ${qrHash}...`);

  // This endpoint requires OAuth2 Bearer token
  const token = await getValidToken();
  const apiKey = (process.env.POAP_API_KEY || '').trim();

  const response = await makeClaimSecretRequest(qrHash, token, apiKey);

  if (!response.ok) {
    const errorText = await response.text();

    console.error(`[POAP API] Get secret failed: ${response.status}`);
    console.error(`[POAP API] Error response: ${errorText}`);

    // If we get 401/403 and haven't retried yet, refresh token and retry
    if ((response.status === 401 || response.status === 403) && retryOnAuth) {
      console.log('[POAP API] Authentication failed, refreshing token and retrying...');

      // Clear current token from database
      await prisma.poapAuth.deleteMany({});

      // Get new token and retry (retryOnAuth = false to prevent infinite loop)
      return await getClaimSecret(qrHash, false);
    }

    throw new Error(
      `Failed to get claim secret: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log(`[POAP API] Secret obtained for ${qrHash}`);
  return data.secret;
}

/**
 * Load QR codes from POAP API and store them in database
 * @param {string} eventId - POAP event ID
 * @param {string} editCode - Edit code for the event
 * @returns {Promise<{loaded: number, newCodes: number, existing: number}>} Result
 */
export async function loadQRCodesFromPOAP(
  eventId: string,
  editCode: string
): Promise<{ loaded: number; newCodes: number; existing: number }> {
  console.log(`Loading QR codes for event ${eventId}...`);

  // Get all QR hashes for the event
  const qrHashes = await getEventQRCodes(eventId, editCode);

  if (qrHashes.length === 0) {
    throw new Error('No QR codes found for this event');
  }

  console.log(`Found ${qrHashes.length} QR codes`);

  let newCodes = 0;
  let existing = 0;

  // Process each QR hash
  for (const qrHash of qrHashes) {
    try {
      // Check if already exists
      const existingQR = await prisma.qRCode.findUnique({
        where: { qrHash },
      });

      if (existingQR) {
        existing++;
        continue;
      }

      // Get the secret for this QR hash
      console.log(`Getting secret for ${qrHash}...`);
      const secret = await getClaimSecret(qrHash);

      // Build mint link
      const mintLink = `https://poap.xyz/claim/${qrHash}`;

      // Store in database
      await prisma.qRCode.create({
        data: {
          qrHash,
          mintLink,
          secret,
        },
      });

      newCodes++;
      console.log(`Loaded QR code: ${qrHash}`);

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to process QR code ${qrHash}:`, error);
    }
  }

  const loaded = newCodes + existing;
  console.log(
    `QR codes loaded: ${loaded} total (${newCodes} new, ${existing} existing)`
  );

  return { loaded, newCodes, existing };
}
