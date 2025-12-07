/**
 * Temporary script to check webhook events and bot configuration
 */

import prisma from '../lib/prisma';

async function checkWebhook() {
  console.log('=== WEBHOOK DIAGNOSIS ===\n');

  // 1. Check recent webhook events
  console.log('1. Recent webhook events (last 10):');
  const recentEvents = await prisma.twitterWebhookEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      method: true,
      eventType: true,
      receivedAt: true,
      body: true,
    },
  });

  console.log(`Found ${recentEvents.length} recent events`);
  recentEvents.forEach((event, i) => {
    console.log(`\n  Event #${i + 1}:`);
    console.log(`    Method: ${event.method}`);
    console.log(`    Type: ${event.eventType}`);
    console.log(`    Received: ${event.receivedAt}`);
    if (event.body) {
      console.log(`    Body keys: ${Object.keys(event.body as object).join(', ')}`);
    }
  });

  // 2. Check bot accounts
  console.log('\n\n2. Bot accounts:');
  const botAccounts = await prisma.botAccount.findMany({
    select: {
      id: true,
      username: true,
      twitterId: true,
      isConnected: true,
      webhookId: true,
      projects: {
        select: {
          id: true,
          name: true,
          twitterHashtag: true,
          isActive: true,
        },
      },
    },
  });

  botAccounts.forEach((bot, i) => {
    console.log(`\n  Bot #${i + 1}:`);
    console.log(`    Username: @${bot.username}`);
    console.log(`    Twitter ID: ${bot.twitterId}`);
    console.log(`    Connected: ${bot.isConnected}`);
    console.log(`    Webhook ID: ${bot.webhookId || 'NOT SET'}`);
    console.log(`    Projects: ${bot.projects.length}`);
    bot.projects.forEach((p, j) => {
      console.log(`      ${j + 1}. ${p.name} (${p.twitterHashtag}) - ${p.isActive ? 'ACTIVE' : 'inactive'}`);
    });
  });

  // 3. Check specific project
  console.log('\n\n3. Project cmiw0q2oh0001lb04ejco2vhv:');
  const project = await prisma.project.findUnique({
    where: { id: 'cmiw0q2oh0001lb04ejco2vhv' },
    include: {
      botAccount: {
        select: {
          username: true,
          twitterId: true,
          isConnected: true,
          webhookId: true,
        },
      },
    },
  });

  if (project) {
    console.log(`  Name: ${project.name}`);
    console.log(`  Hashtag: ${project.twitterHashtag}`);
    console.log(`  Active: ${project.isActive}`);
    console.log(`  Require Code: ${project.requireUniqueCode}`);
    console.log(`  Require Image: ${project.requireImage}`);
    console.log(`  Bot: ${project.botAccount ? `@${project.botAccount.username}` : 'NONE'}`);
    if (project.botAccount) {
      console.log(`  Bot Twitter ID: ${project.botAccount.twitterId}`);
      console.log(`  Bot Webhook ID: ${project.botAccount.webhookId || 'NOT SET'}`);
    }
  } else {
    console.log('  Project not found!');
  }

  // 4. Check tweets for this project
  console.log('\n\n4. Recent tweets for project:');
  const tweets = await prisma.tweet.findMany({
    where: { projectId: 'cmiw0q2oh0001lb04ejco2vhv' },
    orderBy: { processedAt: 'desc' },
    take: 5,
    select: {
      tweetId: true,
      username: true,
      hasImage: true,
      hasCode: true,
      isEligible: true,
      botReplied: true,
      processedAt: true,
    },
  });

  console.log(`Found ${tweets.length} tweets`);
  tweets.forEach((t, i) => {
    console.log(`\n  Tweet #${i + 1}:`);
    console.log(`    ID: ${t.tweetId}`);
    console.log(`    User: @${t.username}`);
    console.log(`    Has image: ${t.hasImage}`);
    console.log(`    Has code: ${t.hasCode}`);
    console.log(`    Eligible: ${t.isEligible}`);
    console.log(`    Bot replied: ${t.botReplied}`);
    console.log(`    Processed: ${t.processedAt}`);
  });

  console.log('\n\n=== END DIAGNOSIS ===');
  await prisma.$disconnect();
}

checkWebhook().catch(console.error);
