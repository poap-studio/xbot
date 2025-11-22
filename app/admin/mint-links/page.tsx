/**
 * Mint Links Management Page
 * Import and manage POAP mint links
 */

'use client';

import { useEffect, useState } from 'react';

interface MintLinkStats {
  total: number;
  available: number;
  reserved: number;
  claimed: number;
}

export default function MintLinksPage() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<MintLinkStats | null>(null);
  const [links, setLinks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/mint-links/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!links.trim()) {
      setError('Please enter at least one mint link');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const linkArray = links
        .split('\n')
        .map((link) => link.trim())
        .filter((link) => link.length > 0);

      const response = await fetch('/api/admin/mint-links/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: linkArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import links');
      }

      setSuccess(
        `Successfully imported ${data.imported} links (${data.duplicates} duplicates skipped)`
      );
      setLinks('');
      fetchStats();
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error importing links:', error);
      setError(error instanceof Error ? error.message : 'Failed to import links');
    } finally {
      setImporting(false);
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
          Mint Links
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import and manage POAP mint links
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Links
            </h3>
            <span className="text-2xl">🔗</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.total || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Available
            </h3>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats?.available || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Reserved
            </h3>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats?.reserved || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Claimed
            </h3>
            <span className="text-2xl">🎉</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.claimed || 0}
          </p>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Import Mint Links
        </h2>

        <div>
          <label
            htmlFor="links"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Paste mint links (one per line)
          </label>
          <textarea
            id="links"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="https://poap.xyz/claim/abc123&#10;https://poap.xyz/claim/def456&#10;https://poap.xyz/claim/ghi789"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter POAP mint links, one per line. Duplicates will be automatically skipped.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing || !links.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Links'}
          </button>
        </div>
      </div>
    </div>
  );
}
