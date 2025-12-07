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
 * Checks if a POAP mint link has been claimed
 * @param {string} qrHash - QR hash from the mint link
 * @returns {Promise<QRCodeResponse>} QR code information including claim status
 * @throws {Error} If request fails
 */
export async function getQRCodeInfo(qrHash: string): Promise<QRCodeResponse> {
  try {
    const token = await getValidToken();

    const url = `${POAP_API_BASE}/actions/claim-qr?qr_hash=${qrHash}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': process.env.POAP_API_KEY || '',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`POAP API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    return {
      qr_hash: data.qr_hash || qrHash,
      claimed: data.claimed || false,
      beneficiary: data.beneficiary,
      event: data.event,
      secret: data.secret,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get QR code info: ${error.message}`);
    }
    throw new Error('Failed to get QR code info: Unknown error');
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
 * @param {string} projectId - Project ID to associate mint links with
 * @returns {Promise<number>} Number of mint links imported
 * @throws {Error} If import fails
 */
export async function importMintLinks(
  eventId: string,
  secretCode: string,
  projectId: string
): Promise<number> {
  try {
    console.log(`Importing mint links for event ${eventId} (project ${projectId})...`);

    const mintLinks = await getMintLinks(eventId, secretCode);

    if (mintLinks.length === 0) {
      throw new Error('No mint links found for this event');
    }

    // Import mint links into database
    let imported = 0;
    for (const link of mintLinks) {
      try {
        await prisma.qRCode.upsert({
          where: { qrHash_projectId: { qrHash: link.qr_hash, projectId } },
          create: {
            qrHash: link.qr_hash,
            mintLink: link.url,
            claimed: link.claimed,
            secret: link.secret,
            projectId,
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
export async function reserveMintLink(twitterId: string, projectId: string): Promise<string | null> {
  try {
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        projectId,
        claimed: false,
        reservedFor: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!qrCode) {
      console.warn(`No available mint links to reserve for project ${projectId}`);
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

    console.log(`Mint link reserved for user ${twitterId} (project ${projectId}): ${qrCode.mintLink}`);
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
    await prisma.qRCode.updateMany({
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
 * @param {string} projectId - Project ID to associate QR codes with
 * @returns {Promise<{loaded: number, newCodes: number, existing: number}>} Result
 */
export async function loadQRCodesFromPOAP(
  eventId: string,
  editCode: string,
  projectId: string
): Promise<{ loaded: number; newCodes: number; deleted: number; skippedClaimed: number }> {
  console.log(`Loading QR codes for event ${eventId} (project ${projectId})...`);

  // Delete all existing QR codes for this project that are not reserved or claimed
  // This ensures we always have fresh data from POAP
  console.log('Deleting unreserved QR codes from database...');
  const deleteResult = await prisma.qRCode.deleteMany({
    where: {
      projectId,
      reservedFor: null,
      claimed: false,
    },
  });
  console.log(`Deleted ${deleteResult.count} unreserved QR codes`);

  // Get all QR hashes for the event
  const qrHashes = await getEventQRCodes(eventId, editCode);

  if (qrHashes.length === 0) {
    throw new Error('No QR codes found for this event');
  }

  console.log(`Found ${qrHashes.length} QR codes from POAP API`);

  let newCodes = 0;
  let skippedClaimed = 0;
  let updated = 0;

  // Process each QR hash
  for (const qrHash of qrHashes) {
    try {
      // Get QR code info from POAP API to check current status
      console.log(`Checking claim status for ${qrHash}...`);
      const qrInfo = await getQRCodeInfo(qrHash);

      // Check if already exists in our database (would only exist if it's reserved or claimed)
      const existingQR = await prisma.qRCode.findFirst({
        where: { qrHash, projectId },
      });

      if (existingQR) {
        // QR exists - it's reserved or claimed
        // Update if the claimed status changed in POAP
        if (qrInfo.claimed && !existingQR.claimed) {
          console.log(`Updating ${qrHash} - now claimed in POAP by ${qrInfo.beneficiary}`);
          await prisma.qRCode.update({
            where: { id: existingQR.id },
            data: {
              claimed: true,
              claimedBy: qrInfo.beneficiary,
              claimedAt: new Date(),
            },
          });

          // Also update the delivery if it exists
          await prisma.delivery.updateMany({
            where: {
              qrHash: existingQR.qrHash,
              projectId: existingQR.projectId,
            },
            data: {
              claimed: true,
              claimedAt: new Date(),
            },
          });

          updated++;
        } else {
          console.log(`Skipping ${qrHash} - already in database, status unchanged`);
        }
        continue;
      }

      // Skip if already claimed in POAP
      if (qrInfo.claimed) {
        console.log(`Skipping ${qrHash} - already claimed in POAP by ${qrInfo.beneficiary}`);
        skippedClaimed++;
        continue;
      }

      // Build mint link
      const mintLink = `https://poap.xyz/claim/${qrHash}`;

      // Store in database (use secret from qrInfo if available, otherwise fetch it separately)
      await prisma.qRCode.create({
        data: {
          qrHash,
          mintLink,
          secret: qrInfo.secret || '',
          projectId,
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

  console.log(
    `QR codes sync complete: ${newCodes} new, ${updated} updated, ${deleteResult.count} deleted, ${skippedClaimed} skipped (claimed in POAP)`
  );

  return { loaded: newCodes, newCodes, deleted: deleteResult.count, skippedClaimed };
}

/**
 * Get POAP event information including name
 * @param {string} eventId - POAP event ID
 * @returns {Promise<{name: string, description: string, imageUrl: string}>} Event info
 */
export async function getEventInfo(
  eventId: string
): Promise<{ name: string; description: string; imageUrl: string }> {
  console.log(`[POAP API] Getting event info for ${eventId}...`);

  const token = await getValidToken();
  const apiKey = (process.env.POAP_API_KEY || '').trim();

  const url = `${POAP_API_BASE}/events/id/${eventId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[POAP API] Get event info failed: ${response.status}`);
    console.error(`[POAP API] Error response: ${errorText}`);
    throw new Error(
      `Failed to get event info: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log(`[POAP API] Event info obtained: ${data.name}`);

  return {
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
  };
}
