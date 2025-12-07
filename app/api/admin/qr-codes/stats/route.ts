/**
 * QR Codes Stats API
 * Get statistics about QR codes for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const [total, available, reserved, claimed] = await Promise.all([
      prisma.qRCode.count({ where: { projectId } }),
      prisma.qRCode.count({
        where: {
          projectId,
          reservedFor: null,
          claimed: false,
        },
      }),
      prisma.qRCode.count({
        where: {
          projectId,
          reservedFor: { not: null },
          claimed: false,
        },
      }),
      prisma.qRCode.count({ where: { projectId, claimed: true } }),
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
