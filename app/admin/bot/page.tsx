/**
 * Bot Configuration Page
 * Configure bot monitoring settings and response messages
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

interface BotConfig {
  twitterHashtag: string;
  botReplyEligible: string;
  botReplyNotEligible: string;
  botConnected: boolean;
  botUsername?: string;
  lastRun?: string;
  processedToday: number;
  errors: number;
}

export default function BotConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BotConfig>({
    twitterHashtag: '',
    botReplyEligible: '',
    botReplyNotEligible: '',
    botConnected: false,
    processedToday: 0,
    errors: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/bot/config');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration');
      }

      setConfig(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching config:', error);
      if (loading) {
        setError(error instanceof Error ? error.message : 'Failed to load configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/bot/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterHashtag: config.twitterHashtag,
          botReplyEligible: config.botReplyEligible,
          botReplyNotEligible: config.botReplyNotEligible,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess('Configuration saved successfully');
      await fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Bot Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The bot is always active listening to the configured hashtag and responding automatically
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Connection Alert for disconnected bot */}
        {!config.botConnected && (
          <Alert
            severity="error"
            sx={{
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Box>
                  <AlertTitle sx={{ fontWeight: 'bold' }}>Bot Account Not Connected</AlertTitle>
                  <Typography variant="body2">
                    You need to connect a Twitter account with write permissions so the bot can automatically respond to tweets.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  href="/api/auth/bot-twitter"
                  sx={{ whiteSpace: 'nowrap', minWidth: 200 }}
                >
                  Connect Twitter Account
                </Button>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Before connecting, configure your Twitter app:
                </Typography>
                <Typography variant="caption" component="div" sx={{ pl: 2 }}>
                  1. Go to <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Twitter Developer Portal</a><br />
                  2. Select your app<br />
                  3. Go to "User authentication settings"<br />
                  4. Enable "OAuth 1.0a"<br />
                  5. Add the callback URL: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px' }}>https://xbot.poap.studio/api/auth/bot-twitter/callback</code><br />
                  6. Configure permissions to "Read and write"<br />
                  7. Save the changes
                </Typography>
              </Box>
            </Stack>
          </Alert>
        )}

        {/* Bot Status Card */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Bot Status
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<ScheduleIcon />}
                label="Runs every minute"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={config.botConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                label={config.botConnected ? 'Connected' : 'Disconnected'}
                color={config.botConnected ? 'success' : 'error'}
              />
            </Stack>
          </Stack>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Bot Account
              </Typography>
              {config.botConnected && config.botUsername ? (
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  @{config.botUsername}
                </Typography>
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  Not connected
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last Execution
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {config.lastRun
                  ? new Date(config.lastRun).toLocaleString('en-US')
                  : 'Never'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Processed Today
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {config.processedToday || 0} tweets
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Errors Today
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: config.errors > 0 ? 'error.main' : 'text.primary' }}>
                {config.errors || 0}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchConfig}
              size="small"
            >
              Update Status
            </Button>
          </Box>
        </Card>

        {/* Configuration Form */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Monitoring Configuration
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Hashtag to Monitor"
              value={config.twitterHashtag}
              onChange={(e) => setConfig({ ...config, twitterHashtag: e.target.value })}
              fullWidth
              placeholder="#POAP"
              helperText="The bot will search for tweets with this hashtag. Include the # symbol"
            />

            <Divider />

            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Response Messages
            </Typography>

            <TextField
              label="Message for Eligible Tweets"
              value={config.botReplyEligible}
              onChange={(e) => setConfig({ ...config, botReplyEligible: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Congratulations! You've shared the correct code. Claim your POAP here: {{claimUrl}}"
              helperText="Use {{claimUrl}} where you want the claim link to appear"
            />

            <TextField
              label="Message for Non-Eligible Tweets"
              value={config.botReplyNotEligible}
              onChange={(e) => setConfig({ ...config, botReplyNotEligible: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Thank you for your interest. Make sure to include a valid code and an image in your tweet."
              helperText="This message will be sent when the tweet doesn't meet the requirements"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={fetchConfig}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Box>
          </Stack>
        </Card>

        {/* Information */}
        <Alert severity="info">
          <AlertTitle>How Does the Bot Work?</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>The bot runs automatically <strong>every minute</strong> via a Vercel cron job</li>
            <li>Searches for new tweets containing the <strong>configured hashtag</strong></li>
            <li>Verifies that the tweet has a <strong>valid code</strong> and an <strong>image</strong></li>
            <li>If eligible, automatically responds with the configured message and a claim link</li>
            <li>If not eligible, responds with the "not eligible" message</li>
          </Box>
        </Alert>
      </Stack>
    </Container>
  );
}
