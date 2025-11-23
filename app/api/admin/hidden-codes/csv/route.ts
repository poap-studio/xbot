/**
 * API Route: Admin Hidden Codes CSV Export
 * Exports all hidden codes to CSV format
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/hidden-codes/csv
 * Returns all hidden codes as CSV file
 */
export async function GET() {
  try {
    const codes = await prisma.validCode.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // CSV Headers
    const headers = [
      'Code',
      'Used',
      'Used By (Twitter ID)',
      'Used At',
      'Created At',
    ];

    // CSV Rows
    const rows = codes.map((code) => [
      code.code,
      code.isUsed ? 'Yes' : 'No',
      code.usedBy || '',
      code.usedAt?.toISOString() || '',
      code.createdAt.toISOString(),
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
    const filename = `hidden-codes-${timestamp}.csv`;

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
