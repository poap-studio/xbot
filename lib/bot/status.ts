/**
 * Bot Status Management
 * Tracks bot running state and activity
 */

interface BotState {
  isRunning: boolean;
  lastRun: Date | null;
  currentProcess: NodeJS.Timeout | null;
}

// In-memory state (in production, this would use Redis or database)
let botState: BotState = {
  isRunning: false,
  lastRun: null,
  currentProcess: null,
};

/**
 * Get current bot status
 */
export async function getBotStatus() {
  return {
    isRunning: botState.isRunning,
    lastRun: botState.lastRun,
  };
}

/**
 * Mark bot as running
 */
export function markBotRunning(process: NodeJS.Timeout | null = null) {
  botState.isRunning = true;
  botState.lastRun = new Date();
  botState.currentProcess = process;
}

/**
 * Mark bot as stopped
 */
export function markBotStopped() {
  if (botState.currentProcess) {
    clearInterval(botState.currentProcess);
  }
  botState.isRunning = false;
  botState.currentProcess = null;
}

/**
 * Update last run time
 */
export function updateLastRun() {
  botState.lastRun = new Date();
}
