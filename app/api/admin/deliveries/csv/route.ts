/**
 * API Route: Admin Deliveries CSV Export
 * Exports all deliveries to CSV format
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries/csv
 * Returns all deliveries as CSV file
 */
export async function GET() {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        twitterUser: true,
      },
      orderBy: {
        deliveredAt: 'desc',
      },
    });

    // CSV Headers
    const headers = [
      'ID',
      'Twitter Username',
      'Twitter User ID',
      'Tweet ID',
      'Tweet URL',
      'Mint Link',
      'QR Hash',
      'Delivered At',
      'Claimed',
      'Claimed At',
    ];

    // CSV Rows
    const rows = deliveries.map((delivery) => [
      delivery.id,
      delivery.twitterUser.username,
      delivery.twitterUser.twitterId,
      delivery.tweetId,
      `https://twitter.com/i/web/status/${delivery.tweetId}`,
      delivery.mintLink,
      delivery.qrHash,
      delivery.deliveredAt.toISOString(),
      delivery.claimed ? 'Yes' : 'No',
      delivery.claimedAt?.toISOString() || '',
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape fields that contain commas, quotes, or newlines
            const stringCell = String(cell);
            if (
              stringCell.includes(',') ||
              stringCell.includes('"') ||
              stringCell.includes('\n')
            ) {
              return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
          })
          .join(',')
      ),
    ].join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `poap-deliveries-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate CSV',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
