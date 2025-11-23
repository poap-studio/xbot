/**
 * API Route: Reset POAP OAuth Token
 * Clears cached token and forces regeneration
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renewToken } from '@/lib/poap/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/poap/reset-token
 * Clears cached POAP OAuth token and generates a new one
 */
export async function POST() {
  try {
    console.log('[POAP Token Reset] Clearing cached tokens...');

    // Delete all existing tokens
    const deleted = await prisma.poapAuth.deleteMany({});

    console.log(`[POAP Token Reset] Deleted ${deleted.count} cached tokens`);

    // Generate new token
    console.log('[POAP Token Reset] Generating new token...');
    const newToken = await renewToken();

    console.log(`[POAP Token Reset] New token generated, length: ${newToken.length}`);

    return NextResponse.json({
      success: true,
      message: 'POAP OAuth token reset successfully',
      tokenLength: newToken.length,
      deletedTokens: deleted.count,
    });
  } catch (error) {
    console.error('[POAP Token Reset] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to reset POAP token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
