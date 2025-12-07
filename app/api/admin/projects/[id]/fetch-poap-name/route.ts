/**
 * API Route: Fetch POAP Event Name
 * POST - Fetch POAP event name and update project name
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEventInfo } from '@/lib/poap/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/projects/[id]/fetch-poap-name
 * Fetch POAP event name from POAP API and update project name
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { poapEventId } = body;

    if (!poapEventId) {
      return NextResponse.json(
        { error: 'POAP Event ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching POAP event info for event ${poapEventId}...`);

    // Fetch event info from POAP API
    const eventInfo = await getEventInfo(poapEventId);

    if (!eventInfo.name) {
      return NextResponse.json(
        { error: 'Could not retrieve event name from POAP API' },
        { status: 500 }
      );
    }

    console.log(`Got POAP event name: ${eventInfo.name}`);

    // Update project name with POAP event name
    const project = await prisma.project.update({
      where: { id },
      data: {
        name: eventInfo.name,
      },
    });

    return NextResponse.json({
      success: true,
      name: project.name,
      description: eventInfo.description,
      imageUrl: eventInfo.imageUrl,
    });
  } catch (error) {
    console.error('Error fetching POAP event name:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch POAP event name',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
