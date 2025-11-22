/**
 * Home Page / Claim Page
 * Users can sign in with Twitter and view/claim their POAP deliveries
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { DeliveryCard, type DeliveryData } from '@/components/claim/DeliveryCard';

interface DeliveriesResponse {
  success: boolean;
  deliveries: DeliveryData[];
  total: number;
  claimed: number;
  unclaimed: number;
  error?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, claimed: 0, unclaimed: 0 });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDeliveries();
    }
  }, [status]);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claim/deliveries');
      const data: DeliveriesResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deliveries');
      }

      setDeliveries(data.deliveries);
      setStats({
        total: data.total,
        claimed: data.claimed,
        unclaimed: data.unclaimed,
      });
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎫</div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                POAP Twitter Bot
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in with Twitter to claim your POAPs
              </p>
            </div>

            <button
              onClick={() => signIn('twitter')}
              className="w-full px-6 py-4 text-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Sign in with Twitter
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-6">
              By signing in, you agree to access your Twitter deliveries
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show deliveries
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My POAP Deliveries
              </h1>
              {session?.user && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Signed in as @{session.user.username}
                </p>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total POAPs</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Claimed</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.claimed}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unclaimed}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={fetchDeliveries}
              className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your deliveries...</p>
          </div>
        )}

        {/* No Deliveries */}
        {!loading && !error && deliveries.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              No POAP deliveries yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Post a tweet with the campaign hashtag and code to receive your POAP
            </p>
          </div>
        )}

        {/* Deliveries Grid */}
        {!loading && deliveries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
