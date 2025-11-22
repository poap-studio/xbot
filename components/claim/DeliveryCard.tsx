/**
 * Delivery Card Component
 * Displays a POAP delivery with claim link
 */

'use client';

import { useState } from 'react';

export interface DeliveryData {
  id: string;
  tweetId: string;
  mintLink: string;
  qrHash: string;
  deliveredAt: string;
  claimed: boolean;
  claimedAt: string | null;
}

interface DeliveryCardProps {
  delivery: DeliveryData;
}

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(delivery.mintLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClaim = () => {
    window.open(delivery.mintLink, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            POAP Delivery
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delivered {formatDate(delivery.deliveredAt)}
          </p>
        </div>

        {/* Status Badge */}
        {delivery.claimed ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Claimed
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
          </span>
        )}
      </div>

      {/* Tweet Link */}
      <div className="mb-4">
        <a
          href={`https://twitter.com/anyuser/status/${delivery.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View original tweet →
        </a>
      </div>

      {/* Claim Section */}
      {!delivery.claimed && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Claim Link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {delivery.mintLink}
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <button
            onClick={handleClaim}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
          >
            Claim POAP Now →
          </button>
        </div>
      )}

      {/* Claimed Info */}
      {delivery.claimed && delivery.claimedAt && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            Claimed on {formatDate(delivery.claimedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
