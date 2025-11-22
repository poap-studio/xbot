'use client';

/**
 * Bot Connection Component
 * Allows admin to connect/disconnect Twitter bot account via OAuth
 */

import { useState, useEffect } from 'react';

interface BotAccount {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  isConnected: boolean;
  connectedAt: string;
  lastUsedAt?: string;
}

interface BotConnectionProps {
  className?: string;
}

export function BotConnection({ className = '' }: BotConnectionProps) {
  const [botAccount, setBotAccount] = useState<BotAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchBotAccount();

    // Check for OAuth callback success/error messages
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const errorMsg = params.get('error');

    if (success === 'bot_connected') {
      // Refresh bot account data after successful connection
      fetchBotAccount();
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      // Remove query params from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function fetchBotAccount() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/bot-account');

      if (!res.ok) {
        throw new Error(`Failed to fetch bot account: ${res.statusText}`);
      }

      const data = await res.json();
      setBotAccount(data.botAccount);
    } catch (err) {
      console.error('Error fetching bot account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bot account');
    } finally {
      setLoading(false);
    }
  }

  async function connectBot() {
    try {
      setError(null);
      // Redirect to OAuth flow
      window.location.href = '/api/auth/bot-twitter';
    } catch (err) {
      console.error('Error initiating bot connection:', err);
      setError('Failed to initiate Twitter connection');
    }
  }

  async function disconnectBot() {
    if (!window.confirm(
      '¿Desconectar cuenta del bot?\n\n' +
      'El bot dejará de funcionar hasta que conectes una nueva cuenta.\n\n' +
      '¿Estás seguro?'
    )) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);

      const res = await fetch('/api/admin/bot-account', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to disconnect bot account');
      }

      setBotAccount(null);
    } catch (err) {
      console.error('Error disconnecting bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect bot account');
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h2 className="text-2xl font-bold mb-4">Cuenta del Bot de Twitter</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-4">Cuenta del Bot de Twitter</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!botAccount ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">
            No hay ninguna cuenta conectada. Conecta una cuenta de Twitter para que el bot
            pueda responder a tweets.
          </p>
          <button
            onClick={connectBot}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            Conectar Cuenta de Twitter
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {botAccount.profileImageUrl && (
                <img
                  src={botAccount.profileImageUrl}
                  alt={botAccount.username}
                  className="w-16 h-16 rounded-full border-2 border-gray-200"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold">{botAccount.displayName}</h3>
                <p className="text-gray-600">@{botAccount.username}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      botAccount.isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {botAccount.isConnected ? 'Conectada' : 'Desconectada'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Conectada: {new Date(botAccount.connectedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {botAccount.lastUsedAt && (
                  <p className="text-xs text-gray-500">
                    Último uso: {new Date(botAccount.lastUsedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={connectBot}
                className="text-blue-600 hover:text-blue-700 px-4 py-2 text-sm font-medium transition-colors"
              >
                Reconectar
              </button>
              <button
                onClick={disconnectBot}
                disabled={disconnecting}
                className="text-red-600 hover:text-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Importante
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1 ml-7">
              <li>• La cuenta conectada será la que responda a los tweets elegibles</li>
              <li>• Asegúrate de que la cuenta tenga permisos de escritura (Read and Write)</li>
              <li>• Puedes reconectar en cualquier momento si los tokens expiran</li>
              <li>• El bot dejará de funcionar si desconectas la cuenta</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
