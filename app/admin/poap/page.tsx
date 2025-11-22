/**
 * POAP Configuration Page
 * Configure event settings and reply templates
 */

'use client';

import { useEffect, useState } from 'react';

interface PoapConfig {
  eventId: string;
  eventName: string;
  searchQuery: string;
  replyTemplate: string;
}

export default function PoapConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PoapConfig>({
    eventId: '',
    eventName: '',
    searchQuery: '',
    replyTemplate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/poap/config');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration');
      }

      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/poap/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
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
          POAP Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure event settings and reply templates
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Event ID */}
        <div>
          <label
            htmlFor="eventId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            POAP Event ID
          </label>
          <input
            type="text"
            id="eventId"
            value={config.eventId}
            onChange={(e) => setConfig({ ...config, eventId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="12345"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The POAP event ID to distribute
          </p>
        </div>

        {/* Event Name */}
        <div>
          <label
            htmlFor="eventName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Event Name
          </label>
          <input
            type="text"
            id="eventName"
            value={config.eventName}
            onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="My POAP Event"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Display name for the event
          </p>
        </div>

        {/* Search Query */}
        <div>
          <label
            htmlFor="searchQuery"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Twitter Search Query
          </label>
          <input
            type="text"
            id="searchQuery"
            value={config.searchQuery}
            onChange={(e) => setConfig({ ...config, searchQuery: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="#MyEvent"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The search query to find eligible tweets (e.g., hashtags, keywords)
          </p>
        </div>

        {/* Reply Template */}
        <div>
          <label
            htmlFor="replyTemplate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Reply Template
          </label>
          <textarea
            id="replyTemplate"
            value={config.replyTemplate}
            onChange={(e) => setConfig({ ...config, replyTemplate: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Thanks for participating! Claim your POAP here: {mintLink}"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Template for bot replies. Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{'{ mintLink }'}</code> as placeholder
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
