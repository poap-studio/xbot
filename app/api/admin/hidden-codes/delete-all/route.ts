/**
 * Hidden Codes Delete All API
 * Delete all hidden codes from the database
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const result = await prisma.validCode.deleteMany({});

    return NextResponse.json({
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting hidden codes:', error);
    return NextResponse.json(
      { error: 'Failed to delete codes' },
      { status: 500 }
    );
  }
}
