/**
 * Hidden Codes Delete All API
 * Delete all hidden codes from a project
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const result = await prisma.validCode.deleteMany({
      where: { projectId },
    });

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
