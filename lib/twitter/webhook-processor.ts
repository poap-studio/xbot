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
            requireUniqueCode: true,
            requireImage: true,
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

        // Extract codes from tweet text (if code validation is required)
        const codes = extractCodesFromText(tweetEvent.text);
        console.log(`[Webhook] Found ${codes.length} potential codes:`, codes);

        // Try to find which project this tweet is for
        // First, try to match by code (if any code is found)
        let validCode: string | undefined;
        let projectId: string | undefined;
        let project: typeof botAccount.projects[0] | undefined;

        // Try to find project by code first
        for (const code of codes) {
          const codeRecord = await prisma.validCode.findFirst({
            where: { code },
            select: { projectId: true, isUsed: true },
          });

          if (codeRecord) {
            // Check if this code belongs to one of the bot's projects
            const foundProject = botAccount.projects.find(p => p.id === codeRecord.projectId);

            if (foundProject) {
              validCode = code;
              projectId = codeRecord.projectId;
              project = foundProject;
              console.log(`[Webhook] Found valid code ${code} for project ${projectId}`);
              break;
            } else {
              console.log(`[Webhook] Code ${code} belongs to a different bot's project`);
            }
          }
        }

        // If no code found, check if any project allows tweets without code
        if (!project) {
          // Try to match by hashtag for projects that don't require unique code
          const projectsWithoutCodeReq = botAccount.projects.filter(p => !p.requireUniqueCode);

          for (const proj of projectsWithoutCodeReq) {
            // Check if tweet has this project's hashtag
            const tweetHashtags = tweetEvent.entities?.hashtags?.map((h: { text: string }) => h.text.toLowerCase()) || [];
            const requiredHashtag = proj.twitterHashtag.replace('#', '').toLowerCase();

            if (tweetHashtags.includes(requiredHashtag)) {
              project = proj;
              projectId = proj.id;
              console.log(`[Webhook] Matched project ${projectId} by hashtag #${requiredHashtag} (no code required)`);
              break;
            }
          }
        }

        // If still no project found, skip this tweet
        if (!project || !projectId) {
          console.log(`[Webhook] No matching project found for this tweet`);
          results.skipped++;
          continue;
        }

        // Validate hashtag (always required)
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

        // Validate unique code (if required)
        if (project.requireUniqueCode && !validCode) {
          console.log(`[Webhook] Project requires unique code but none found, replying with error`);

          const { processNotEligibleTweet } = await import('@/lib/bot/service');
          const processedTweet = {
            id: tweetEvent.id_str,
            text: tweetEvent.text,
            authorId: tweetEvent.user.id_str,
            authorUsername: tweetEvent.user.screen_name,
            hasImage: false,
            hasCode: false,
            hiddenCode: undefined,
            isEligible: false,
            createdAt: new Date(tweetEvent.created_at),
          };

          await saveTweet(processedTweet);
          const replied = await processNotEligibleTweet(processedTweet, projectId, botAccount.id);

          if (replied) {
            console.log(`[Webhook] ✅ Sent error reply (missing code)`);
            results.processed++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // Check if tweet has media (image)
        const hasImage = Boolean(
          tweetEvent.entities?.media &&
          tweetEvent.entities.media.length > 0 &&
          tweetEvent.entities.media[0].type === 'photo'
        );

        console.log(`[Webhook] Tweet has image: ${hasImage}`);
        console.log(`[Webhook] Project requires image: ${project.requireImage}`);

        // Validate image (if required)
        if (project.requireImage && !hasImage) {
          console.log(`[Webhook] Project requires image but tweet doesn't have one, replying with error`);

          const processedTweet = {
            id: tweetEvent.id_str,
            text: tweetEvent.text,
            authorId: tweetEvent.user.id_str,
            authorUsername: tweetEvent.user.screen_name,
            hasImage,
            hasCode: Boolean(validCode),
            hiddenCode: validCode,
            isEligible: false,
            createdAt: new Date(tweetEvent.created_at),
          };

          await saveTweet(processedTweet);
          const { processNotEligibleTweet } = await import('@/lib/bot/service');
          const replied = await processNotEligibleTweet(processedTweet, projectId, botAccount.id);

          if (replied) {
            console.log(`[Webhook] ✅ Sent error reply (missing image)`);
            results.processed++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // All validations passed - tweet is eligible for POAP delivery
        console.log(`[Webhook] Tweet meets all requirements, processing...`);

        // Parse created_at to Date
        const createdAt = new Date(tweetEvent.created_at);

        // Convert to ProcessedTweet format
        const processedTweet: ProcessedTweet = {
          id: tweetEvent.id_str,
          text: tweetEvent.text,
          authorId: tweetEvent.user.id_str,
          authorUsername: tweetEvent.user.screen_name,
          hasImage,
          hasCode: Boolean(validCode),
          hiddenCode: validCode,
          isEligible: true, // All validations passed
          createdAt,
        };

        console.log(`[Webhook] Tweet is ELIGIBLE for POAP delivery`);

        // Save tweet to database
        await saveTweet(processedTweet);

        // Process and deliver POAP
        const result = await processSingleTweet(processedTweet);

        if (result.success) {
          console.log(`[Webhook] ✅ Successfully delivered POAP to @${result.username}`);
          results.processed++;
        } else {
          console.error(`[Webhook] ❌ Failed to process tweet: ${result.error}`);
          results.errors.push(`Tweet ${tweetEvent.id_str}: ${result.error}`);
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
