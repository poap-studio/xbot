/**
 * API Route: Admin Cron Logs
 * Get cron job execution history
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cron-logs
 * Returns recent cron job executions with status and errors
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'success', 'error', 'warning'

    const where = status ? { status } : {};

    const logs = await prisma.cronLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // Calculate summary stats
    const stats = await prisma.cronLog.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const totalLogs = await prisma.cronLog.count();
    const last24Hours = await prisma.cronLog.count({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const successRate = totalLogs > 0
      ? ((stats.find((s) => s.status === 'success')?._count.status || 0) / totalLogs) * 100
      : 0;

    return NextResponse.json({
      logs: logs.map((log) => {
        // Try to parse errorDetails as JSON, fallback to raw string
        let errorDetails = null;
        if (log.errorDetails) {
          try {
            errorDetails = JSON.parse(log.errorDetails);
          } catch {
            // If not valid JSON, return as string
            errorDetails = log.errorDetails;
          }
        }

        return {
          id: log.id,
          status: log.status,
          tweetsFound: log.tweetsFound,
          processed: log.processed,
          failed: log.failed,
          errorMessage: log.errorMessage,
          errorDetails,
          executionTime: log.executionTime,
          startedAt: log.startedAt.toISOString(),
          completedAt: log.completedAt?.toISOString(),
        };
      }),
      stats: {
        total: totalLogs,
        last24Hours,
        successRate: successRate.toFixed(1),
        byStatus: stats.reduce(
          (acc, s) => ({ ...acc, [s.status]: s._count.status }),
          {}
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching cron logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron logs' },
      { status: 500 }
    );
  }
}
