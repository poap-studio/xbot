/**
 * Hidden Codes Stats API
 * Get statistics about hidden codes
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

    const [total, used] = await Promise.all([
      prisma.validCode.count({ where: { projectId } }),
      prisma.validCode.count({ where: { projectId, isUsed: true } }),
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
