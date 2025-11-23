/**
 * QR Codes Stats API
 * Get statistics about QR codes
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [total, available, reserved, claimed] = await Promise.all([
      prisma.qRCode.count(),
      prisma.qRCode.count({
        where: {
          reservedFor: null,
          claimed: false,
        },
      }),
      prisma.qRCode.count({
        where: {
          reservedFor: { not: null },
          claimed: false,
        },
      }),
      prisma.qRCode.count({ where: { claimed: true } }),
    ]);

    return NextResponse.json({
      total,
      available,
      reserved,
      claimed,
    });
  } catch (error) {
    console.error('Error fetching QR codes stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
