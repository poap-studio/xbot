/**
 * Monitor webhook events in real-time
 * Shows new events as they arrive
 */

import prisma from '../lib/prisma';

async function monitorEvents() {
  console.log('=== MONITORING WEBHOOK EVENTS ===');
  console.log('Watching for new events... (Ctrl+C to stop)\n');

  let lastEventId: string | null = null;

  // Get the most recent event ID to start from
  const latestEvent = await prisma.twitterWebhookEvent.findFirst({
    orderBy: { receivedAt: 'desc' },
    select: { id: true },
  });

  if (latestEvent) {
    lastEventId = latestEvent.id;
    console.log(`Starting from event ID: ${lastEventId}\n`);
  }

  // Poll for new events every 2 seconds
  setInterval(async () => {
    try {
      const newEvents = await prisma.twitterWebhookEvent.findMany({
        where: lastEventId
          ? {
              id: { gt: lastEventId },
            }
          : undefined,
        orderBy: { receivedAt: 'asc' },
        take: 10,
      });

      if (newEvents.length > 0) {
        for (const event of newEvents) {
          console.log(`\n🔔 NEW EVENT at ${event.receivedAt}`);
          console.log(`   Method: ${event.method}`);
          console.log(`   Type: ${event.eventType}`);

          if (event.body) {
            const body = event.body as any;

            // Show tweet details if available
            if (body.tweet_create_events && body.tweet_create_events.length > 0) {
              const tweet = body.tweet_create_events[0];
              console.log(`   Tweet ID: ${tweet.id_str}`);
              console.log(`   From: @${tweet.user?.screen_name || 'unknown'}`);
              console.log(`   Text: ${tweet.text?.substring(0, 100) || 'N/A'}`);
            }
          }

          lastEventId = event.id;
        }
      }
    } catch (error) {
      console.error('Error polling events:', error);
    }
  }, 2000);

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n\n✋ Stopping monitor...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

monitorEvents().catch(console.error);
