/**
 * Twitter Integration Module
 * Exports all Twitter-related functionality
 */

// Client exports
export {
  getBearerClient,
  getBotClient,
  verifyBotCredentials,
  getBotInfo,
  isBotConnected,
} from './client';

// Search exports
export {
  searchTweets,
  searchNewEligibleTweets,
  getLastProcessedTweetId,
  saveTweet,
  saveTweets,
} from './search';

export type { SearchCriteria, ProcessedTweet } from './search';

// Reply exports
export {
  replyToTweet,
  markTweetAsReplied,
  generateReplyText,
  replyWithClaimUrl,
  hasBeenRepliedTo,
  getUnrepliedEligibleTweets,
  getReplyStats,
} from './reply';

export type { ReplyOptions } from './reply';
