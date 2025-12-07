/**
 * API Route: Generate Dynamic QR Code
 * Returns a QR code with tracking URL
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';
import { getOrCreateValidCode } from '@/lib/codes/generator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/generate?projectId=xxx
 * Generate QR code with next available hidden code for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    // Get or create an available code for this project
    const code = await getOrCreateValidCode(projectId);

    console.log(`Generating QR for code: ${code} (project: ${project.name})`);

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create tracking URL that will redirect to Twitter
    const trackingUrl = `${baseUrl}/api/qr/track?code=${encodeURIComponent(code)}&projectId=${encodeURIComponent(projectId)}`;

    console.log(`Tracking URL: ${trackingUrl}`);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    console.log(`✓ QR generated successfully for code: ${code}`);

    return NextResponse.json({
      qrDataUrl,
      code,
      projectName: project.name,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
