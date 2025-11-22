/**
 * Bot Control Page
 * Start, stop and monitor the bot
 */

'use client';

import { useEffect, useState } from 'react';

interface BotStatus {
  running: boolean;
  connected: boolean;
  username?: string;
  lastRun?: string;
  processedToday: number;
  errors: number;
}

export default function BotControlPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Poll status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/bot/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching status:', error);
      if (loading) {
        setError(error instanceof Error ? error.message : 'Failed to load status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error starting bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to start bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error stopping bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunOnce = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/run-once', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error running bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to run bot');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Bot Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Start, stop and monitor the bot
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Bot Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Status
          </h2>
          <div className="flex items-center gap-2">
            {status?.running ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ● Running
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                ○ Stopped
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Bot Account</p>
            {status?.connected ? (
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                @{status.username}
              </p>
            ) : (
              <p className="text-lg font-medium text-red-600 dark:text-red-400">
                Not connected
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Run</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {status?.lastRun
                ? new Date(status.lastRun).toLocaleString()
                : 'Never'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processed Today</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {status?.processedToday || 0} tweets
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Errors Today</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {status?.errors || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          {!status?.running ? (
            <button
              onClick={handleStart}
              disabled={actionLoading || !status?.connected}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Starting...' : 'Start Bot'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Stopping...' : 'Stop Bot'}
            </button>
          )}

          <button
            onClick={handleRunOnce}
            disabled={actionLoading || status?.running || !status?.connected}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? 'Running...' : 'Run Once'}
          </button>

          <button
            onClick={fetchStatus}
            disabled={actionLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh Status
          </button>
        </div>

        {!status?.connected && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Bot account is not connected. Please connect the bot account in the Dashboard before starting.
            </p>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          About Bot Control
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>Start Bot</strong>: Runs the bot continuously in the background</li>
          <li>• <strong>Stop Bot</strong>: Stops the background process</li>
          <li>• <strong>Run Once</strong>: Processes tweets once without continuous monitoring</li>
        </ul>
      </div>
    </div>
  );
}
