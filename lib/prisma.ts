/**
 * Prisma Client Singleton
 * Prevents multiple instances of Prisma Client in development
 * Optimized for serverless environments with connection pooling
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Build DATABASE_URL with optimized connection pool parameters for serverless
 * Adds connection_limit and pool_timeout if not already present
 */
function getOptimizedDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if URL already has connection pool parameters
  if (databaseUrl.includes('connection_limit') && databaseUrl.includes('pool_timeout')) {
    return databaseUrl;
  }

  // Add optimized parameters for serverless
  // connection_limit: 100 connections per lambda instance (high for concurrent webhooks)
  // pool_timeout: 60 seconds (increased to handle high load and prevent timeouts)
  // statement_cache_size: 0 (recommended for serverless to avoid caching issues)
  const separator = databaseUrl.includes('?') ? '&' : '?';
  const poolParams = 'connection_limit=100&pool_timeout=60&statement_cache_size=0';

  return `${databaseUrl}${separator}${poolParams}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log connection pool configuration on initialization
if (process.env.NODE_ENV === 'production') {
  console.log('[Prisma] Client initialized with optimized connection pooling for serverless');
}

export default prisma;
