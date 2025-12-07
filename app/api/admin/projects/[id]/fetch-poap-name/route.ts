/**
 * API Route: Fetch POAP Event Name
 * Fetches the event name from POAP API and updates project name
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMintLinks, getQRCodeInfo } from '@/lib/poap/api';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/projects/[id]/fetch-poap-name
 * Fetches POAP event name and updates project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { poapEventId, poapEditCode } = body;

    if (!poapEventId || !poapEditCode) {
      return NextResponse.json(
        { error: 'POAP Event ID and Edit Code are required' },
        { status: 400 }
      );
    }

    // Get a mint link to extract event information
    const mintLinks = await getMintLinks(poapEventId, poapEditCode);

    if (!mintLinks || mintLinks.length === 0) {
      // If no mint links, use fallback name with current date
      const fallbackName = `New project ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })}`;

      await prisma.project.update({
        where: { id },
        data: { name: fallbackName },
      });

      return NextResponse.json({
        name: fallbackName,
        isFallback: true,
      });
    }

    // Get QR code info to extract event details
    const qrInfo = await getQRCodeInfo(mintLinks[0].qr_hash);

    let projectName = `New project ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })}`;

    if (qrInfo.event && qrInfo.event.name) {
      projectName = qrInfo.event.name;
    }

    // Update project name
    await prisma.project.update({
      where: { id },
      data: { name: projectName },
    });

    return NextResponse.json({
      name: projectName,
      isFallback: !qrInfo.event?.name,
    });
  } catch (error) {
    console.error('Error fetching POAP event name:', error);

    // On error, use fallback name
    const { id } = await params;
    const fallbackName = `New project ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })}`;

    try {
      await prisma.project.update({
        where: { id },
        data: { name: fallbackName },
      });

      return NextResponse.json({
        name: fallbackName,
        isFallback: true,
        error: error instanceof Error ? error.message : 'Failed to fetch POAP event name',
      });
    } catch (updateError) {
      return NextResponse.json(
        { error: 'Failed to update project name' },
        { status: 500 }
      );
    }
  }
}
