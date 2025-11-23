/**
 * QR Codes Load API
 * Load QR codes from POAP API using Event ID and Edit Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadQRCodesFromPOAP } from '@/lib/poap/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for loading many QR codes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, editCode } = body;

    if (!eventId || !editCode) {
      return NextResponse.json(
        { error: 'Event ID and Edit Code are required' },
        { status: 400 }
      );
    }

    console.log(`Loading QR codes for event ${eventId}...`);

    const result = await loadQRCodesFromPOAP(eventId, editCode);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading QR codes:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load QR codes from POAP API',
      },
      { status: 500 }
    );
  }
}
