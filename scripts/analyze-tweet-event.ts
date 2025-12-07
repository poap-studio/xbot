/**
 * Analyze a specific tweet event to debug why it failed
 */

import prisma from '../lib/prisma';

const TWEET_ID = '1997730023185478100';

async function analyzeTweetEvent() {
  console.log('=== ANALYZING TWEET EVENT ===\n');
  console.log(`Tweet ID: ${TWEET_ID}\n`);

  // 1. Get the webhook event
  console.log('1. Checking webhook event...\n');
  const webhookEvent = await prisma.twitterWebhookEvent.findFirst({
    where: { eventType: 'TWEET_CREATE' },
    orderBy: { receivedAt: 'desc' },
  });

  if (!webhookEvent) {
    console.log('❌ No webhook event found');
    await prisma.$disconnect();
    return;
  }

  const body = webhookEvent.body as any;
  const tweetEvents = body.tweet_create_events;

  if (!tweetEvents || tweetEvents.length === 0) {
    console.log('❌ No tweet events in webhook body');
    await prisma.$disconnect();
    return;
  }

  const tweetEvent = tweetEvents.find((t: any) => t.id_str === TWEET_ID);

  if (!tweetEvent) {
    console.log('❌ Tweet not found in webhook events');
    console.log('Available tweets:', tweetEvents.map((t: any) => t.id_str));
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Found webhook event');
  console.log(`   Received at: ${webhookEvent.receivedAt}`);
  console.log(`   Tweet text: "${tweetEvent.text}"`);
  console.log(`   User: @${tweetEvent.user.screen_name}`);
  console.log('');

  // 2. Analyze tweet content
  console.log('2. Analyzing tweet content...\n');

  // Check for mentions
  const mentions = tweetEvent.entities?.user_mentions || [];
  console.log(`   Mentions: ${mentions.length}`);
  mentions.forEach((m: any) => {
    console.log(`     - @${m.screen_name} (ID: ${m.id_str})`);
  });
  console.log('');

  // Check for hashtags
  const hashtags = tweetEvent.entities?.hashtags || [];
  console.log(`   Hashtags: ${hashtags.length}`);
  hashtags.forEach((h: any) => {
    console.log(`     - #${h.text}`);
  });
  console.log('');

  // Check for media
  const media = tweetEvent.entities?.media || [];
  console.log(`   Media: ${media.length}`);
  media.forEach((m: any) => {
    console.log(`     - Type: ${m.type}, URL: ${m.media_url_https}`);
  });
  console.log('');

  // 3. Check if tweet was saved in database
  console.log('3. Checking database records...\n');
  const tweet = await prisma.tweet.findFirst({
    where: { tweetId: TWEET_ID },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          twitterHashtag: true,
          requireUniqueCode: true,
          requireImage: true,
          isActive: true,
          botAccount: {
            select: {
              username: true,
              twitterId: true,
            },
          },
        },
      },
    },
  });

  if (tweet) {
    console.log('✅ Tweet saved in database');
    console.log(`   Project: ${tweet.project.name}`);
    console.log(`   Has Image: ${tweet.hasImage}`);
    console.log(`   Has Code: ${tweet.hasCode}`);
    console.log(`   Is Eligible: ${tweet.isEligible}`);
    console.log(`   Bot Replied: ${tweet.botReplied}`);
    console.log('');

    console.log('   Project Settings:');
    console.log(`     - Active: ${tweet.project.isActive}`);
    console.log(`     - Required Hashtag: ${tweet.project.twitterHashtag}`);
    console.log(`     - Require Code: ${tweet.project.requireUniqueCode}`);
    console.log(`     - Require Image: ${tweet.project.requireImage}`);
    console.log(`     - Bot: @${tweet.project.botAccount?.username || 'N/A'} (${tweet.project.botAccount?.twitterId || 'N/A'})`);
    console.log('');
  } else {
    console.log('❌ Tweet NOT saved in database');
    console.log('');
  }

  // 4. Check for delivery
  console.log('4. Checking delivery...\n');
  const delivery = await prisma.delivery.findFirst({
    where: { tweetId: TWEET_ID },
  });

  if (delivery) {
    console.log('✅ Delivery created');
    console.log(`   Mint Link: ${delivery.mintLink}`);
    console.log(`   Claimed: ${delivery.claimed}`);
  } else {
    console.log('❌ No delivery created');
  }
  console.log('');

  // 5. Extract potential codes from tweet text
  console.log('5. Extracting potential codes from tweet...\n');
  const text = tweetEvent.text.toUpperCase();
  const words = text.split(/\s+/);
  const potentialCodes = words.filter((word: string) => {
    // Remove @ and # prefixes, URLs, etc.
    const clean = word.replace(/[@#,.:;!?]/g, '');
    // Must be 4-8 characters, alphanumeric
    return /^[A-Z0-9]{4,8}$/.test(clean);
  });

  console.log(`   Potential codes found: ${potentialCodes.length}`);
  potentialCodes.forEach((code: string) => {
    console.log(`     - ${code}`);
  });
  console.log('');

  // 6. Check if codes exist in database
  if (potentialCodes.length > 0) {
    console.log('6. Checking codes in database...\n');

    for (const codeText of potentialCodes) {
      const validCode = await prisma.validCode.findFirst({
        where: { code: codeText },
        include: {
          project: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (validCode) {
        console.log(`   ✅ Code "${codeText}" found:`);
        console.log(`      Project: ${validCode.project.name}`);
        console.log(`      Is Used: ${validCode.isUsed}`);
        console.log(`      Project Active: ${validCode.project.isActive}`);
      } else {
        console.log(`   ❌ Code "${codeText}" NOT found in database`);
      }
    }
  }

  await prisma.$disconnect();
}

analyzeTweetEvent().catch(console.error);
