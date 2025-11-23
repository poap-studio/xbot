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
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface PoapConfig {
  eventId: string;
  editCode: string;
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
  });
  const [qrStats, setQRStats] = useState<QRCodeStats>({
    total: 0,
    available: 0,
    reserved: 0,
    claimed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/poap/config', {
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
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadQRCodes = async () => {
    if (!config.eventId || !config.editCode) {
      setError('Debes guardar Event ID y Edit Code antes de cargar QR codes');
      return;
    }

    setLoadingQRCodes(true);
    setError(null);
    setSuccess(null);

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

      setSuccess(`${data.loaded} QR codes cargados correctamente (${data.newCodes} nuevos, ${data.existing} ya existían)`);
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
            Configuración POAP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configura el evento POAP y carga los QR codes disponibles
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

        {/* Event Configuration */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Configuración del Evento
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="POAP Event ID"
              value={config.eventId}
              onChange={(e) => setConfig({ ...config, eventId: e.target.value })}
              fullWidth
              placeholder="123456"
              helperText="El ID del evento POAP del cual cargar los QR codes"
            />

            <TextField
              label="Edit Code"
              value={config.editCode}
              onChange={(e) => setConfig({ ...config, editCode: e.target.value })}
              fullWidth
              type="password"
              placeholder="tu-edit-code-secreto"
              helperText="El código de edición del evento POAP (necesario para acceder a los QR codes)"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={fetchConfig}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </Box>
          </Stack>
        </Card>

        {/* QR Codes Management */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              QR Codes del Evento
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchQRStats}
              size="small"
            >
              Actualizar
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
                Disponibles
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {qrStats.reserved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reservados
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {qrStats.claimed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reclamados
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
            {loadingQRCodes ? 'Cargando QR Codes...' : 'Cargar/Actualizar QR Codes desde POAP'}
          </Button>

          <Alert severity="info" sx={{ mt: 2 }} icon={<InfoIcon />}>
            Este botón carga todos los QR codes del evento desde la API de POAP. Si se agregan nuevos
            QR codes en POAP, haz clic aquí para actualizarlos.
          </Alert>
        </Card>
      </Stack>
    </Container>
  );
}
