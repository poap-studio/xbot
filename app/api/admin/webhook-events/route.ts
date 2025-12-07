/**
 * Admin API: View captured webhook events
 * GET /api/admin/webhook-events - List all webhook events
 * DELETE /api/admin/webhook-events - Clear all webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - List all webhook events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const method = searchParams.get('method');
    const eventType = searchParams.get('eventType');

    const where: any = {};
    if (method) where.method = method;
    if (eventType) where.eventType = eventType;

    const events = await prisma.twitterWebhookEvent.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });

    const stats = await prisma.twitterWebhookEvent.groupBy({
      by: ['eventType'],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      events,
      stats,
      total: await prisma.twitterWebhookEvent.count(where ? { where } : undefined),
    });

  } catch (error) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook events' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all webhook events
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.twitterWebhookEvent.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });

  } catch (error) {
    console.error('Error deleting webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook events' },
      { status: 500 }
    );
  }
}
