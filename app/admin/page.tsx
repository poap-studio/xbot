/**
 * Admin Dashboard Page
 * Main page for bot administration
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  bot: {
    connected: boolean;
    username?: string;
    lastUsed?: string;
  };
  deliveries: {
    total: number;
    claimed: number;
    unclaimed: number;
    claimRate: number;
  };
  mintLinks: {
    total: number;
    available: number;
    reserved: number;
    claimed: number;
  };
  tweets: {
    total: number;
    eligible: number;
    replied: number;
    pending: number;
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your POAP bot activity
        </p>
      </div>

      {/* Bot Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bot Status
          </h2>
          {stats?.bot.connected ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              ✓ Connected
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              ✗ Disconnected
            </span>
          )}
        </div>

        {stats?.bot.connected && stats.bot.username && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connected as <span className="font-medium">@{stats.bot.username}</span>
          </p>
        )}

        {!stats?.bot.connected && (
          <div className="mt-4">
            <Link
              href="/api/auth/bot-twitter"
              className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              Connect Bot Account
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deliveries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Deliveries
            </h3>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.deliveries.total || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats?.deliveries.claimed || 0} claimed ({stats?.deliveries.claimRate.toFixed(1) || 0}%)
          </p>
        </div>

        {/* Mint Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Mint Links
            </h3>
            <span className="text-2xl">🔗</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.mintLinks.available || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats?.mintLinks.total || 0} total
          </p>
        </div>

        {/* Tweets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Eligible Tweets
            </h3>
            <span className="text-2xl">🐦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.tweets.eligible || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats?.tweets.pending || 0} pending reply
          </p>
        </div>

        {/* Claim Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Claim Rate
            </h3>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.deliveries.claimRate.toFixed(1) || 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats?.deliveries.claimed || 0} of {stats?.deliveries.total || 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/poap"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Configure POAP
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Event settings & reply text
              </p>
            </div>
          </Link>

          <Link
            href="/admin/mint-links"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <span className="text-2xl">🔗</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Import Links
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add new mint links
              </p>
            </div>
          </Link>

          <Link
            href="/admin/bot"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Control Bot
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start/stop automation
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
