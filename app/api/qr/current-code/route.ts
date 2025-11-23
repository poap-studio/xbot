/**
 * API Route: Get Current Available Code
 * Returns the current available code without generating a QR
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/current-code
 * Get current available hidden code (for polling)
 */
export async function GET(request: NextRequest) {
  try {
    // Get next available (unused) hidden code
    const availableCode = await prisma.validCode.findFirst({
      where: { isUsed: false },
      orderBy: { createdAt: 'asc' },
    });

    if (!availableCode) {
      return NextResponse.json(
        { error: 'No codes available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: availableCode.code,
    });
  } catch (error) {
    console.error('Error fetching current code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current code' },
      { status: 500 }
    );
  }
}
