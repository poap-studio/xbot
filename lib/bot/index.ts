/**
 * Bot Module
 * Exports all bot-related functionality
 */

// Service exports
export {
  processSingleTweet,
  runBotProcess,
  validateBotConfiguration,
} from './service';

export type { ProcessResult, DeliveryAttempt } from './service';

// Delivery exports
export {
  recordDelivery,
  hasDelivery,
  getDeliveryByTweet,
  getUserDeliveries,
  markDeliveryClaimed,
  getDeliveryStats,
  getRecentDeliveries,
} from './delivery';

export type { DeliveryRecord, DeliveryStats } from './delivery';
