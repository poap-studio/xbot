/**
 * QR Page Configuration
 * Configure dynamic QR codes for Twitter engagement and QR page display
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
  Divider,
  CardContent,
  CardHeader,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  QrCode2 as QrCodeIcon,
  Launch as LaunchIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  Wallpaper as WallpaperIcon,
} from '@mui/icons-material';

interface QrPageConfig {
  tweetTemplate: string;
  hashtag?: string;
  logoUrl?: string | null;
  backgroundUrl?: string | null;
  customText?: string | null;
  poapEventId?: string | null;
}

export default function QrPageConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'background' | null>(null);
  const [config, setConfig] = useState<QrPageConfig>({
    tweetTemplate: '',
    hashtag: '',
    logoUrl: null,
    backgroundUrl: null,
    customText: null,
    poapEventId: null,
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

      console.log('QR Page config loaded:', data);
      setConfig({
        tweetTemplate: data.tweetTemplate || '',
        hashtag: data.hashtag || '#POAP',
        logoUrl: data.logoUrl || null,
        backgroundUrl: data.backgroundUrl || null,
        customText: data.customText || null,
        poapEventId: data.poapEventId || null,
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
          logoUrl: config.logoUrl,
          backgroundUrl: config.backgroundUrl,
          customText: config.customText,
          poapEventId: config.poapEventId,
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

  const handleFileUpload = async (file: File, type: 'logo' | 'background') => {
    setUploading(type);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/admin/qr-page/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      // Update config with new URL
      setConfig({
        ...config,
        [type === 'logo' ? 'logoUrl' : 'backgroundUrl']: data.url,
      });

      setSuccess(`${type === 'logo' ? 'Logo' : 'Background'} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(null);
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
            Configure the dynamic QR code experience and visual display
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

        {/* SECTION 1: Collector Experience */}
        <Card>
          <CardHeader
            title="1. Collector Experience"
            subheader="Configure what happens when users scan the QR code"
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
          />
          <CardContent>
            <Stack spacing={3}>
              <TextField
                label="Tweet Template"
                value={config.tweetTemplate}
                onChange={(e) => setConfig({ ...config, tweetTemplate: e.target.value })}
                fullWidth
                multiline
                rows={4}
                placeholder="I visited the POAP Studio booth at ETH Global, and here's the proof! The secret word is {{code}} {{hashtag}}"
                helperText={`Use {{code}} for the hidden code and {{hashtag}} for the configured hashtag (${config.hashtag || '#POAP'}). Both will be replaced automatically.`}
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
                    {config.tweetTemplate
                      .replaceAll('{{code}}', 'ABC123')
                      .replaceAll('{{hashtag}}', config.hashtag || '#POAP')}
                  </Typography>
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* SECTION 2: QR Page Display */}
        <Card>
          <CardHeader
            title="2. QR Page Display"
            subheader="Customize how the QR code page looks to visitors"
            sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
          />
          <CardContent>
            <Stack spacing={4}>
              {/* Logo Upload */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Logo
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploading === 'logo' ? <CircularProgress size={20} /> : <ImageIcon />}
                      fullWidth
                      disabled={uploading === 'logo'}
                    >
                      {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logo');
                        }}
                      />
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {config.logoUrl && (
                      <Box sx={{ textAlign: 'center' }}>
                        <img
                          src={config.logoUrl}
                          alt="Logo preview"
                          style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Current logo
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Background Upload */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Background Image
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploading === 'background' ? <CircularProgress size={20} /> : <WallpaperIcon />}
                      fullWidth
                      disabled={uploading === 'background'}
                    >
                      {uploading === 'background' ? 'Uploading...' : 'Upload Background'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'background');
                        }}
                      />
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {config.backgroundUrl && (
                      <Box sx={{ textAlign: 'center' }}>
                        <img
                          src={config.backgroundUrl}
                          alt="Background preview"
                          style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Current background
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* POAP Event ID */}
              <TextField
                label="POAP Event ID"
                value={config.poapEventId || ''}
                onChange={(e) => setConfig({ ...config, poapEventId: e.target.value || null })}
                fullWidth
                placeholder="12345"
                helperText="Enter the POAP event ID to display the POAP artwork on the QR page"
              />

              <Divider />

              {/* Custom Text */}
              <TextField
                label="Custom Text (overlay on QR code)"
                value={config.customText || ''}
                onChange={(e) => setConfig({ ...config, customText: e.target.value || null })}
                fullWidth
                multiline
                rows={2}
                placeholder="Scan to get your POAP!"
                helperText="This text will appear below the QR code"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            endIcon={<LaunchIcon />}
            onClick={handleViewQR}
          >
            Preview QR Page
          </Button>

          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !config.tweetTemplate.includes('{{code}}')}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </Box>

        {/* Info Card */}
        <Alert severity="info">
          <AlertTitle>How It Works</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2, mb: 2 }}>
            <li>The QR code displays a unique URL that tracks when it's scanned</li>
            <li>When scanned, users see the customized page with your logo, background, and POAP artwork</li>
            <li>They are then redirected to Twitter with a pre-filled tweet containing a unique code</li>
            <li>The QR updates automatically after each scan with a new code</li>
          </Box>
          <strong>Layout:</strong> Logo at top → POAP artwork and QR code side by side → Custom text overlay on QR
        </Alert>
      </Stack>
    </Container>
  );
}
