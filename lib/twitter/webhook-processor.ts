/**
 * Twitter Webhook Event Processor
 * Processes mention events from Twitter webhooks
 */

import prisma from '@/lib/prisma';
import { processSingleTweet } from '@/lib/bot/service';
import type { ProcessedTweet } from '@/lib/twitter/search';
import { saveTweet } from '@/lib/twitter/search';

/**
 * Twitter webhook event structure for tweet creation
 */
interface WebhookTweetEvent {
  for_user_id: string; // Bot account ID being mentioned
  tweet_create_events: Array<{
    id_str: string;
    created_at: string; // e.g., "Mon Dec 07 18:00:43 +0000 2025"
    text: string;
    user: {
      id_str: string;
      screen_name: string;
      name: string;
    };
    entities: {
      hashtags?: Array<{ text: string }>;
      user_mentions?: Array<{
        screen_name: string;
        id_str: string;
      }>;
      media?: Array<{
        type: string;
        media_url_https: string;
      }>;
    };
  }>;
}

/**
 * Extract valid codes from tweet text
 * Codes are 5 alphanumeric characters (using custom alphabet)
 */
function extractCodesFromText(text: string): string[] {
  // Match 5-character codes using our custom alphabet (23456789ABCDEFGHJKLMNPQRSTUVWXYZ)
  const codePattern = /\b[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}\b/g;
  const matches = text.match(codePattern);
  return matches || [];
}

/**
 * Process a tweet create event from Twitter webhook
 * @param webhookEvent - The webhook event body
 * @returns Processing results
 */
export async function processWebhookTweetEvent(webhookEvent: any): Promise<{
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
}> {
  const results = {
    success: true,
    processed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Validate event structure
    if (!webhookEvent.tweet_create_events || !Array.isArray(webhookEvent.tweet_create_events)) {
      console.log('[Webhook] No tweet_create_events in webhook body');
      return results;
    }

    const botAccountId = webhookEvent.for_user_id;
    console.log(`[Webhook] Processing events for bot account: ${botAccountId}`);

    // Get the bot account to verify it exists and get its username
    const botAccount = await prisma.botAccount.findUnique({
      where: { twitterId: botAccountId },
      include: {
        projects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            allowMultipleClaims: true,
            twitterHashtag: true,
          },
        },
      },
    });

    if (!botAccount) {
      console.error(`[Webhook] Bot account not found: ${botAccountId}`);
      results.errors.push(`Bot account not found: ${botAccountId}`);
      results.success = false;
      return results;
    }

    console.log(`[Webhook] Bot @${botAccount.username} has ${botAccount.projects.length} active projects`);

    // Process each tweet in the event
    for (const tweetEvent of webhookEvent.tweet_create_events) {
      try {
        console.log(`[Webhook] Processing tweet ${tweetEvent.id_str} from @${tweetEvent.user.screen_name}`);

        // Skip tweets from the bot itself
        if (tweetEvent.user.id_str === botAccountId) {
          console.log(`[Webhook] Skipping tweet from bot itself`);
          results.skipped++;
          continue;
        }

        // Extract codes from tweet text
        const codes = extractCodesFromText(tweetEvent.text);
        console.log(`[Webhook] Found ${codes.length} potential codes:`, codes);

        if (codes.length === 0) {
          console.log(`[Webhook] No valid codes found in tweet`);
          results.skipped++;
          continue;
        }

        // Find which code belongs to one of this bot's projects
        let validCode: string | undefined;
        let projectId: string | undefined;

        for (const code of codes) {
          const codeRecord = await prisma.validCode.findFirst({
            where: { code },
            select: { projectId: true, isUsed: true },
          });

          if (codeRecord) {
            // Check if this code belongs to one of the bot's projects
            const belongsToBot = botAccount.projects.some(p => p.id === codeRecord.projectId);

            if (belongsToBot) {
              validCode = code;
              projectId = codeRecord.projectId;
              console.log(`[Webhook] Found valid code ${code} for project ${projectId}`);
              break;
            } else {
              console.log(`[Webhook] Code ${code} belongs to a different bot's project`);
            }
          }
        }

        if (!validCode || !projectId) {
          console.log(`[Webhook] No valid code found for this bot's projects`);
          results.skipped++;
          continue;
        }

        // Get the project details to check hashtag requirement
        const project = botAccount.projects.find(p => p.id === projectId);
        if (!project) {
          console.log(`[Webhook] Project ${projectId} not found in bot's active projects`);
          results.skipped++;
          continue;
        }

        // Extract hashtags from tweet
        const tweetHashtags = tweetEvent.entities?.hashtags?.map((h: { text: string }) => h.text.toLowerCase()) || [];
        const requiredHashtag = project.twitterHashtag.replace('#', '').toLowerCase();
        const hasHashtag = tweetHashtags.includes(requiredHashtag);

        console.log(`[Webhook] Required hashtag: #${requiredHashtag}`);
        console.log(`[Webhook] Tweet hashtags:`, tweetHashtags);
        console.log(`[Webhook] Tweet has required hashtag: ${hasHashtag}`);

        // If tweet doesn't have the required hashtag, ignore it completely (no response)
        if (!hasHashtag) {
          console.log(`[Webhook] Tweet missing required hashtag #${requiredHashtag}, ignoring without response`);
          results.skipped++;
          continue;
        }

        // Check if tweet has media (image)
        const hasImage = Boolean(
          tweetEvent.entities?.media &&
          tweetEvent.entities.media.length > 0 &&
          tweetEvent.entities.media[0].type === 'photo'
        );

        console.log(`[Webhook] Tweet has image: ${hasImage}`);

        // Parse created_at to Date
        const createdAt = new Date(tweetEvent.created_at);

        // Convert to ProcessedTweet format
        const processedTweet: ProcessedTweet = {
          id: tweetEvent.id_str,
          text: tweetEvent.text,
          authorId: tweetEvent.user.id_str,
          authorUsername: tweetEvent.user.screen_name,
          hasImage,
          hasCode: true,
          hiddenCode: validCode,
          isEligible: hasImage && hasHashtag, // Eligible if has code, image, and hashtag
          createdAt,
        };

        console.log(`[Webhook] Tweet eligibility: ${processedTweet.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);

        // Save tweet to database
        await saveTweet(processedTweet);

        // Process the tweet
        if (processedTweet.isEligible) {
          // Tweet has hashtag, code, and image - deliver POAP
          console.log(`[Webhook] Processing eligible tweet...`);
          const result = await processSingleTweet(processedTweet);

          if (result.success) {
            console.log(`[Webhook] ✅ Successfully delivered POAP to @${result.username}`);
            results.processed++;
          } else {
            console.error(`[Webhook] ❌ Failed to process tweet: ${result.error}`);
            results.errors.push(`Tweet ${tweetEvent.id_str}: ${result.error}`);
          }
        } else {
          // Tweet has hashtag and code but missing image - reply with error message
          console.log(`[Webhook] Tweet not eligible (missing image), replying with error message`);

          // Import and use processNotEligibleTweet to send error reply
          const { processNotEligibleTweet } = await import('@/lib/bot/service');
          const replied = await processNotEligibleTweet(processedTweet, projectId, botAccount.id);

          if (replied) {
            console.log(`[Webhook] ✅ Sent error reply to @${processedTweet.authorUsername}`);
            results.processed++;
          } else {
            console.log(`[Webhook] ⚠️ Could not send error reply (might already be replied)`);
            results.skipped++;
          }
        }

      } catch (error) {
        console.error(`[Webhook] Error processing tweet ${tweetEvent.id_str}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Tweet ${tweetEvent.id_str}: ${errorMsg}`);
      }
    }

    results.success = results.errors.length === 0;

  } catch (error) {
    console.error('[Webhook] Error processing webhook event:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`Critical error: ${errorMsg}`);
    results.success = false;
  }

  return results;
}
