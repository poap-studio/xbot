/**
 * View captured webhook events from Twitter
 * Usage: npx tsx scripts/view-webhook-events.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewWebhookEvents() {
  try {
    console.log('📋 Fetching webhook events...\n');

    // Get total count
    const total = await prisma.twitterWebhookEvent.count();
    console.log(`Total events captured: ${total}\n`);

    if (total === 0) {
      console.log('No webhook events captured yet.');
      console.log('\nTo test:');
      console.log('1. Mention the connected Twitter account');
      console.log('2. Wait a few seconds');
      console.log('3. Run this script again\n');
      return;
    }

    // Get stats by event type
    const stats = await prisma.twitterWebhookEvent.groupBy({
      by: ['eventType'],
      _count: true,
    });

    console.log('Events by type:');
    stats.forEach((stat) => {
      console.log(`  - ${stat.eventType || 'UNKNOWN'}: ${stat._count}`);
    });
    console.log('');

    // Get recent events
    const recentEvents = await prisma.twitterWebhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 10,
    });

    console.log('Recent events (last 10):');
    console.log('═'.repeat(80));

    recentEvents.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.method} - ${event.eventType || 'UNKNOWN'}`);
      console.log(`   Received: ${event.receivedAt.toLocaleString()}`);
      console.log(`   Path: ${event.path}`);

      if (event.ipAddress) {
        console.log(`   IP: ${event.ipAddress}`);
      }

      // Show body summary if it exists
      if (event.body && typeof event.body === 'object') {
        const bodyKeys = Object.keys(event.body as object);
        if (bodyKeys.length > 0) {
          console.log(`   Body keys: ${bodyKeys.join(', ')}`);
        }
      }

      // Show query params if they exist
      if (event.queryParams && typeof event.queryParams === 'object') {
        const paramKeys = Object.keys(event.queryParams as object);
        if (paramKeys.length > 0) {
          console.log(`   Query params: ${paramKeys.join(', ')}`);
        }
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 Tip: To see full event details, use Prisma Studio:');
    console.log('   npx prisma studio\n');

  } catch (error) {
    console.error('❌ Error fetching webhook events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewWebhookEvents();
