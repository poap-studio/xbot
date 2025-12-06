/**
 * API Route: Upload Valid Codes from CSV
 * POST /api/admin/valid-codes/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/valid-codes/upload
 * Upload valid codes from CSV
 * Expected format: one code per line or comma-separated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes, projectId, replaceExisting } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: 'No codes provided. Expected array of strings.' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Clean and validate codes
    const cleanCodes = codes
      .map((code: string) => code.trim().toUpperCase())
      .filter((code: string) => code.length > 0 && code.length <= 100);

    if (cleanCodes.length === 0) {
      return NextResponse.json(
        { error: 'No valid codes found after cleaning' },
        { status: 400 }
      );
    }

    // Remove duplicates
    const uniqueCodes = [...new Set(cleanCodes)];

    // Replace existing codes for this project if requested
    if (replaceExisting) {
      await prisma.validCode.deleteMany({
        where: { projectId },
      });
    }

    // Insert codes (ignore duplicates)
    const results = await Promise.allSettled(
      uniqueCodes.map((code) =>
        prisma.validCode.upsert({
          where: { code_projectId: { code, projectId } },
          update: {}, // Don't update if exists
          create: { code, projectId },
        })
      )
    );

    const inserted = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      inserted,
      failed,
      total: uniqueCodes.length,
      message: `Inserted ${inserted} codes${failed > 0 ? `, ${failed} failed` : ''}`,
    });
  } catch (error) {
    console.error('Error uploading valid codes:', error);

    return NextResponse.json(
      {
        error: 'Failed to upload codes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/valid-codes/upload
 * Get stats about valid codes
 */
export async function GET() {
  try {
    const total = await prisma.validCode.count();
    const used = await prisma.validCode.count({ where: { isUsed: true } });
    const available = total - used;

    return NextResponse.json({
      success: true,
      total,
      used,
      available,
    });
  } catch (error) {
    console.error('Error fetching valid codes stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
