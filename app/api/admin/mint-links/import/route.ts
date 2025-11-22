/**
 * API Route: Import Mint Links
 * Bulk import of POAP mint links
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/mint-links/import
 * Imports mint links in bulk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { links } = body;

    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json(
        { error: 'Links array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all links are strings
    if (!links.every((link) => typeof link === 'string')) {
      return NextResponse.json(
        { error: 'All links must be strings' },
        { status: 400 }
      );
    }

    // Validate links format
    const invalidLinks = links.filter(
      (link) => !link.startsWith('https://poap.xyz/claim/') && !link.startsWith('http://poap.xyz/claim/')
    );

    if (invalidLinks.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid link format',
          details: `Found ${invalidLinks.length} invalid links. All links must be POAP claim URLs.`,
        },
        { status: 400 }
      );
    }

    // Import links with duplicate detection
    let imported = 0;
    let duplicates = 0;

    for (const link of links) {
      try {
        // Extract qrHash from link
        const qrHash = link.split('/claim/')[1];

        if (!qrHash) {
          continue;
        }

        // Try to create the QR code entry
        await prisma.qRCode.create({
          data: {
            mintLink: link,
            qrHash,
            claimed: false,
          },
        });

        imported++;
      } catch (error: any) {
        // Check if it's a duplicate error
        if (error.code === 'P2002') {
          duplicates++;
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      duplicates,
      total: links.length,
    });
  } catch (error) {
    console.error('Error importing mint links:', error);

    return NextResponse.json(
      {
        error: 'Failed to import links',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
