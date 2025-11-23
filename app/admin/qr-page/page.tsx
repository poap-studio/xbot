/**
 * QR Page Configuration
 * Configure dynamic QR codes for Twitter engagement
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Button,
  CircularProgress,
  Alert,
  TextField,
  AlertTitle,
} from '@mui/material';
import {
  Save as SaveIcon,
  QrCode2 as QrCodeIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

interface QrPageConfig {
  tweetTemplate: string;
}

export default function QrPageConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<QrPageConfig>({
    tweetTemplate: '',
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
      const response = await fetch('/api/admin/qr-page/config');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch config');
      }

      setConfig({
        tweetTemplate: data.tweetTemplate || '',
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      setError(error instanceof Error ? error.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/qr-page/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetTemplate: config.tweetTemplate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save config');
      }

      setSuccess('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleViewQR = () => {
    window.open('/qr', '_blank', 'noopener,noreferrer');
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
            QR Page Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the dynamic QR code that generates tweets with hidden codes
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

        {/* Configuration Card */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Tweet Template
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Tweet Template"
              value={config.tweetTemplate}
              onChange={(e) => setConfig({ ...config, tweetTemplate: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="I visited the POAP Studio booth at ETH Global, and here's the proof! The secret word is {{code}} #ethglobalxpoap"
              helperText="Use {{code}} as placeholder for the hidden code. This will be replaced with an actual code when users scan the QR."
              error={!!(config.tweetTemplate && !config.tweetTemplate.includes('{{code}}'))}
            />

            {config.tweetTemplate && (
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Preview with example code "ABC123":
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'background.default',
                    p: 2,
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {config.tweetTemplate.replaceAll('{{code}}', 'ABC123')}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !config.tweetTemplate.includes('{{code}}')}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<QrCodeIcon />}
                endIcon={<LaunchIcon />}
                onClick={handleViewQR}
              >
                View Dynamic QR
              </Button>
            </Box>
          </Stack>
        </Card>

        {/* Info Card */}
        <Alert severity="info">
          <AlertTitle>How Dynamic QR Codes Work</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>The QR code displays a unique URL that tracks when it's scanned</li>
            <li>When scanned, users are redirected to Twitter with a pre-filled tweet</li>
            <li>Each tweet contains a unique hidden code from your pool of available codes</li>
            <li>After a QR scan is detected, the code is marked as used and the QR updates automatically</li>
            <li>The next person who scans will get a different hidden code</li>
          </Box>
        </Alert>
      </Stack>
    </Container>
  );
}
