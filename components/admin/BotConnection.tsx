'use client';

/**
 * Bot Connection Component
 * Allows admin to connect/disconnect Twitter bot account via OAuth
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Stack,
  AlertTitle,
} from '@mui/material';
import {
  Twitter as TwitterIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';

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
      'Disconnect bot account?\n\n' +
      'The bot will stop working until you connect a new account.\n\n' +
      'Are you sure?'
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
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Cuenta del Bot de Twitter
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
        Twitter Bot Account
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {!botAccount ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <TwitterIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: '600px', mx: 'auto' }}>
            No account connected. Connect a Twitter account so the bot can reply to tweets.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<TwitterIcon />}
            onClick={connectBot}
            sx={{
              bgcolor: '#1DA1F2',
              '&:hover': { bgcolor: '#1A8CD8' },
            }}
          >
            Connect Twitter Account
          </Button>
        </Box>
      ) : (
        <Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start" justifyContent="space-between">
            {/* Bot Account Info */}
            <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
              <Avatar
                src={botAccount.profileImageUrl}
                alt={botAccount.username}
                sx={{ width: 64, height: 64, border: '2px solid', borderColor: 'divider' }}
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {botAccount.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  @{botAccount.username}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Chip
                    icon={botAccount.isConnected ? <CheckCircleIcon /> : <CancelIcon />}
                    label={botAccount.isConnected ? 'Connected' : 'Disconnected'}
                    color={botAccount.isConnected ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Connected: {new Date(botAccount.connectedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
                {botAccount.lastUsedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Last used: {new Date(botAccount.lastUsedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={disconnectBot}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </Stack>
          </Stack>

          {/* Important Notice */}
          <Alert severity="warning" sx={{ mt: 3 }}>
            <AlertTitle>Important</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>The connected account will be the one that replies to eligible tweets</li>
              <li>Make sure the account has write permissions (Read and Write)</li>
              <li>You can reconnect at any time if tokens expire</li>
              <li>The bot will stop working if you disconnect the account</li>
            </Box>
          </Alert>
        </Box>
      )}
    </Card>
  );
}
