/**
 * POAP Configuration Page
 * Configure POAP event settings and load QR codes
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  Stack,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface PoapConfig {
  eventId: string;
  editCode: string;
  allowMultipleClaims: boolean;
}

interface QRCodeStats {
  total: number;
  available: number;
  reserved: number;
  claimed: number;
}

export default function PoapConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingQRCodes, setLoadingQRCodes] = useState(false);
  const [config, setConfig] = useState<PoapConfig>({
    eventId: '',
    editCode: '',
    allowMultipleClaims: false,
  });
  const [qrStats, setQRStats] = useState<QRCodeStats>({
    total: 0,
    available: 0,
    reserved: 0,
    claimed: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchQRStats();
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

      setConfig({
        eventId: data.eventId || '',
        editCode: data.editCode || '',
        allowMultipleClaims: data.allowMultipleClaims ?? false,
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchQRStats = async () => {
    try {
      const response = await fetch('/api/admin/qr-codes/stats');
      const data = await response.json();

      if (response.ok) {
        setQRStats(data);
      }
    } catch (error) {
      console.error('Error fetching QR stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/poap/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: config.eventId,
          editCode: config.editCode,
          allowMultipleClaims: config.allowMultipleClaims,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadQRCodes = async () => {
    if (!config.eventId || !config.editCode) {
      setError('You must save Event ID and Edit Code before loading QR codes');
      return;
    }

    setLoadingQRCodes(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/qr-codes/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: config.eventId,
          editCode: config.editCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load QR codes');
      }

      await fetchQRStats();
    } catch (error) {
      console.error('Error loading QR codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load QR codes');
    } finally {
      setLoadingQRCodes(false);
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
            POAP Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the POAP event and load available QR codes
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Event Configuration */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Event Configuration
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="POAP Event ID"
              value={config.eventId}
              onChange={(e) => setConfig({ ...config, eventId: e.target.value })}
              fullWidth
              placeholder="123456"
              helperText="The POAP event ID from which to load QR codes"
            />

            <TextField
              label="Edit Code"
              value={config.editCode}
              onChange={(e) => setConfig({ ...config, editCode: e.target.value })}
              fullWidth
              type="password"
              placeholder="your-secret-edit-code"
              helperText="The POAP event edit code (required to access QR codes)"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={config.allowMultipleClaims}
                  onChange={(e) => setConfig({ ...config, allowMultipleClaims: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Allow Multiple Claims Per User</Typography>
                  <Typography variant="caption" color="text.secondary">
                    If enabled, users can claim multiple POAPs for the same event with different valid tweets
                  </Typography>
                </Box>
              }
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

        {/* QR Codes Management */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Event QR Codes
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchQRStats}
              size="small"
            >
              Refresh
            </Button>
          </Stack>

          {/* Stats */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {qrStats.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {qrStats.available}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Available
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {qrStats.reserved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reserved
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {qrStats.claimed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Claimed
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            startIcon={loadingQRCodes ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            onClick={handleLoadQRCodes}
            disabled={loadingQRCodes || !config.eventId || !config.editCode}
          >
            {loadingQRCodes ? 'Loading QR Codes...' : 'Load/Update QR Codes from POAP'}
          </Button>

          <Alert severity="info" sx={{ mt: 2 }} icon={<InfoIcon />}>
            This button loads all QR codes from the event via the POAP API. If new QR codes are added to POAP, click here to update them.
          </Alert>
        </Card>
      </Stack>
    </Container>
  );
}
