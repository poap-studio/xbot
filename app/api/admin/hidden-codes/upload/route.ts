/**
 * Hidden Codes Upload API
 * Upload new hidden codes to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes } = body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: 'Codes array is required' },
        { status: 400 }
      );
    }

    // Filter out invalid codes
    const validCodes = codes
      .filter((code) => typeof code === 'string' && code.trim().length > 0)
      .map((code) => code.trim());

    if (validCodes.length === 0) {
      return NextResponse.json(
        { error: 'No valid codes provided' },
        { status: 400 }
      );
    }

    // Check for existing codes
    const existing = await prisma.validCode.findMany({
      where: {
        code: {
          in: validCodes,
        },
      },
      select: { code: true },
    });

    const existingCodes = new Set(existing.map((c) => c.code));
    const newCodes = validCodes.filter((code) => !existingCodes.has(code));

    // Insert new codes
    if (newCodes.length > 0) {
      await prisma.validCode.createMany({
        data: newCodes.map((code) => ({ code })),
      });
    }

    return NextResponse.json({
      added: newCodes.length,
      duplicates: validCodes.length - newCodes.length,
      total: validCodes.length,
    });
  } catch (error) {
    console.error('Error uploading hidden codes:', error);
    return NextResponse.json(
      { error: 'Failed to upload codes' },
      { status: 500 }
    );
  }
}
