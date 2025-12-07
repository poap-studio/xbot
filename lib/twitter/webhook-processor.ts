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

        // Step 1: Extract tweet hashtags
        const tweetHashtags = tweetEvent.entities?.hashtags?.map((h: { text: string }) => h.text.toLowerCase()) || [];
        console.log(`[Webhook] Tweet hashtags:`, tweetHashtags);

        // Step 2: Find ALL projects that match any of the tweet's hashtags
        const matchingProjects: typeof botAccount.projects = [];
        for (const proj of botAccount.projects) {
          const requiredHashtag = proj.twitterHashtag.replace('#', '').toLowerCase();
          if (tweetHashtags.includes(requiredHashtag)) {
            matchingProjects.push(proj);
            console.log(`[Webhook] Project "${proj.name}" matched by hashtag #${requiredHashtag}`);
          }
        }

        // Step 3: If no projects match, skip this tweet
        if (matchingProjects.length === 0) {
          console.log(`[Webhook] No projects found with matching hashtags, ignoring tweet`);
          results.skipped++;
          continue;
        }

        console.log(`[Webhook] Tweet applies to ${matchingProjects.length} project(s)`);

        // Step 4: Extract potential codes from tweet
        const codes = extractCodesFromText(tweetEvent.text);
        console.log(`[Webhook] Found ${codes.length} potential codes:`, codes);

        // Step 5: Check if tweet has image
        const hasImage = Boolean(
          tweetEvent.entities?.media &&
          tweetEvent.entities.media.length > 0 &&
          tweetEvent.entities.media[0].type === 'photo'
        );
        console.log(`[Webhook] Tweet has image: ${hasImage}`);

        // Step 6: Process each matching project
        for (const project of matchingProjects) {
          try {
            console.log(`\n[Webhook] Processing project "${project.name}" (${project.id})`);
            console.log(`[Webhook]   Requires code: ${project.requireUniqueCode}`);
            console.log(`[Webhook]   Requires image: ${project.requireImage}`);

            // Find valid code for THIS specific project
            let validCodeForProject: string | undefined;
            for (const code of codes) {
              const codeRecord = await prisma.validCode.findFirst({
                where: {
                  code,
                  projectId: project.id,
                },
                select: { isUsed: true },
              });

              if (codeRecord) {
                validCodeForProject = code;
                console.log(`[Webhook]   Found valid code "${code}" for this project`);
                break;
              }
            }

            // Validate: Check if code is required but missing
            if (project.requireUniqueCode && !validCodeForProject) {
              console.log(`[Webhook]   ❌ Project requires code but none found, replying with error`);

              const { processNotEligibleTweet } = await import('@/lib/bot/service');
              const processedTweet = {
                id: tweetEvent.id_str,
                text: tweetEvent.text,
                authorId: tweetEvent.user.id_str,
                authorUsername: tweetEvent.user.screen_name,
                hasImage,
                hasCode: false,
                hiddenCode: undefined,
                isEligible: false,
                createdAt: new Date(tweetEvent.created_at),
              };

              await saveTweet(processedTweet);
              const replied = await processNotEligibleTweet(processedTweet, project.id, botAccount.id);

              if (replied) {
                console.log(`[Webhook]   ✅ Sent error reply (missing code)`);
                results.processed++;
              } else {
                results.skipped++;
              }
              continue; // Skip to next project
            }

            // Validate: Check if image is required but missing
            if (project.requireImage && !hasImage) {
              console.log(`[Webhook]   ❌ Project requires image but tweet doesn't have one, replying with error`);

              const processedTweet = {
                id: tweetEvent.id_str,
                text: tweetEvent.text,
                authorId: tweetEvent.user.id_str,
                authorUsername: tweetEvent.user.screen_name,
                hasImage,
                hasCode: Boolean(validCodeForProject),
                hiddenCode: validCodeForProject,
                isEligible: false,
                createdAt: new Date(tweetEvent.created_at),
              };

              await saveTweet(processedTweet);
              const { processNotEligibleTweet } = await import('@/lib/bot/service');
              const replied = await processNotEligibleTweet(processedTweet, project.id, botAccount.id);

              if (replied) {
                console.log(`[Webhook]   ✅ Sent error reply (missing image)`);
                results.processed++;
              } else {
                results.skipped++;
              }
              continue; // Skip to next project
            }

            // All validations passed - tweet is eligible for POAP delivery
            console.log(`[Webhook]   ✅ Tweet meets all requirements for this project, processing...`);

            // Parse created_at to Date
            const createdAt = new Date(tweetEvent.created_at);

            // Convert to ProcessedTweet format
            const processedTweet: ProcessedTweet = {
              id: tweetEvent.id_str,
              text: tweetEvent.text,
              authorId: tweetEvent.user.id_str,
              authorUsername: tweetEvent.user.screen_name,
              hasImage,
              hasCode: Boolean(validCodeForProject),
              hiddenCode: validCodeForProject,
              isEligible: true, // All validations passed
              createdAt,
            };

            // Save tweet to database
            await saveTweet(processedTweet);

            // Process and deliver POAP (pass project ID since we already know it from hashtag)
            const result = await processSingleTweet(processedTweet, project.id);

            if (result.success) {
              console.log(`[Webhook]   ✅ Successfully delivered POAP to @${result.username}`);
              results.processed++;
            } else {
              console.error(`[Webhook]   ❌ Failed to process tweet: ${result.error}`);
              results.errors.push(`Tweet ${tweetEvent.id_str} (project ${project.id}): ${result.error}`);
            }

          } catch (projectError) {
            console.error(`[Webhook]   ❌ Error processing project ${project.id}:`, projectError);
            const errorMsg = projectError instanceof Error ? projectError.message : 'Unknown error';
            results.errors.push(`Tweet ${tweetEvent.id_str} (project ${project.id}): ${errorMsg}`);
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
