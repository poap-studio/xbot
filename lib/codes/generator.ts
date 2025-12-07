/**
 * Valid Code Auto-Generation Utility
 * Automatically generates and manages valid codes for projects
 */

import { customAlphabet } from 'nanoid';
import prisma from '@/lib/prisma';

// Custom alphabet excluding similar-looking characters (0, O, I, 1, L)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 5);

/**
 * Generate a unique code string (5 random characters)
 */
function generateCodeString(): string {
  return nanoid();
}

/**
 * Get an unused and unscanned valid code for the project, or create a new one if none exist
 * States:
 * - Not used AND not scanned: Available for display on QR
 * - Not used BUT scanned: User visited page but hasn't tweeted yet - generate new code
 * - Used AND scanned: User visited page and tweeted - code is consumed
 */
export async function getOrCreateValidCode(projectId: string): Promise<string> {
  // Try to find a code that hasn't been used AND hasn't been scanned
  const availableCode = await prisma.validCode.findFirst({
    where: {
      projectId,
      isUsed: false,
      isScanned: false, // Must not be scanned yet
    },
    orderBy: {
      createdAt: 'asc', // Use oldest first
    },
  });

  if (availableCode) {
    return availableCode.code;
  }

  // No unused code found, generate a new one
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const newCode = generateCodeString();

    try {
      // Try to create the code (will fail if duplicate)
      const created = await prisma.validCode.create({
        data: {
          code: newCode,
          projectId,
          isUsed: false,
        },
      });

      console.log(`[Code Generator] Generated new code: ${created.code} for project ${projectId}`);
      return created.code;
    } catch (error) {
      // Duplicate code, try again
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate unique code after ${maxAttempts} attempts`);
      }
    }
  }

  throw new Error('Failed to generate valid code');
}

/**
 * Mark a code as scanned (user visited the QR tracking page)
 */
export async function markCodeAsScanned(
  code: string,
  projectId: string
): Promise<void> {
  await prisma.validCode.updateMany({
    where: {
      code,
      projectId,
      isScanned: false, // Only mark as scanned if not already scanned
    },
    data: {
      isScanned: true,
      scannedAt: new Date(),
    },
  });

  console.log(`[Code Generator] Marked code ${code} as scanned`);
}

/**
 * Mark a code as used (user tweeted with this code)
 */
export async function markCodeAsUsed(
  code: string,
  projectId: string,
  usedBy: string
): Promise<void> {
  await prisma.validCode.updateMany({
    where: {
      code,
      projectId,
    },
    data: {
      isUsed: true,
      usedBy,
      usedAt: new Date(),
    },
  });

  console.log(`[Code Generator] Marked code ${code} as used by ${usedBy}`);
}

/**
 * Get code usage statistics for a project
 */
export async function getCodeStats(projectId: string): Promise<{
  total: number;
  used: number;
  scanned: number;
  available: number;
}> {
  const [total, used, scanned, scannedButNotUsed] = await Promise.all([
    prisma.validCode.count({
      where: { projectId },
    }),
    prisma.validCode.count({
      where: { projectId, isUsed: true },
    }),
    prisma.validCode.count({
      where: { projectId, isScanned: true },
    }),
    prisma.validCode.count({
      where: { projectId, isScanned: true, isUsed: false },
    }),
  ]);

  return {
    total,
    used,
    scanned,
    available: total - scanned, // Codes that haven't been scanned yet
  };
}
