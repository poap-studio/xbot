/**
 * Check specific webhook event details
 */

import prisma from '../lib/prisma';

async function checkEventDetail() {
  // Get the most recent TWEET_CREATE event
  const event = await prisma.twitterWebhookEvent.findFirst({
    where: { eventType: 'TWEET_CREATE' },
    orderBy: { receivedAt: 'desc' },
  });

  if (!event) {
    console.log('No TWEET_CREATE events found');
    return;
  }

  console.log('=== WEBHOOK EVENT DETAILS ===');
  console.log(`Received: ${event.receivedAt}`);
  console.log(`Method: ${event.method}`);
  console.log(`Type: ${event.eventType}`);
  console.log('\nBody:');
  console.log(JSON.stringify(event.body, null, 2));

  await prisma.$disconnect();
}

checkEventDetail().catch(console.error);
