/**
 * Hidden Codes Stats API
 * Get statistics about hidden codes
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [total, used] = await Promise.all([
      prisma.validCode.count(),
      prisma.validCode.count({ where: { isUsed: true } }),
    ]);

    return NextResponse.json({
      total,
      used,
      available: total - used,
    });
  } catch (error) {
    console.error('Error fetching hidden codes stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
