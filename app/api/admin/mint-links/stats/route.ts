/**
 * API Route: Mint Links Statistics
 * Returns statistics about mint links
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/mint-links/stats
 * Returns mint link statistics
 */
export async function GET() {
  try {
    const [total, available, reserved, claimed] = await Promise.all([
      prisma.qRCode.count(),
      prisma.qRCode.count({ where: { claimed: false, reservedFor: null } }),
      prisma.qRCode.count({ where: { claimed: false, reservedFor: { not: null } } }),
      prisma.qRCode.count({ where: { claimed: true } }),
    ]);

    return NextResponse.json({
      total,
      available,
      reserved,
      claimed,
    });
  } catch (error) {
    console.error('Error fetching mint link stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
