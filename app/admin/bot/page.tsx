/**
 * Bot Control Page
 * Start, stop and monitor the bot
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
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  PlayCircle as PlayCircleIcon,
} from '@mui/icons-material';

interface BotStatus {
  running: boolean;
  connected: boolean;
  username?: string;
  lastRun?: string;
  processedToday: number;
  errors: number;
}

export default function BotControlPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Poll status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/bot/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching status:', error);
      if (loading) {
        setError(error instanceof Error ? error.message : 'Failed to load status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error starting bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to start bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error stopping bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunOnce = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/bot/run-once', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run bot');
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error running bot:', error);
      setError(error instanceof Error ? error.message : 'Failed to run bot');
    } finally {
      setActionLoading(false);
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
            Control del Bot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inicia, detiene y monitorea el bot
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Bot Status */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Estado Actual
            </Typography>
            <Chip
              label={status?.running ? 'Ejecutándose' : 'Detenido'}
              color={status?.running ? 'success' : 'default'}
              icon={status?.running ? <PlayCircleIcon /> : <StopIcon />}
            />
          </Stack>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
            },
            gap: 3,
          }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cuenta del Bot
              </Typography>
              {status?.connected ? (
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  @{status.username}
                </Typography>
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  No conectada
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Última Ejecución
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {status?.lastRun
                  ? new Date(status.lastRun).toLocaleString('es-ES')
                  : 'Nunca'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Procesados Hoy
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {status?.processedToday || 0} tweets
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Errores Hoy
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {status?.errors || 0}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Control Actions */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Acciones
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {!status?.running ? (
              <Button
                variant="contained"
                color="success"
                startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleStart}
                disabled={actionLoading || !status?.connected}
              >
                {actionLoading ? 'Iniciando...' : 'Iniciar Bot'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <StopIcon />}
                onClick={handleStop}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deteniendo...' : 'Detener Bot'}
              </Button>
            )}

            <Button
              variant="contained"
              startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <PlayCircleIcon />}
              onClick={handleRunOnce}
              disabled={actionLoading || status?.running || !status?.connected}
            >
              {actionLoading ? 'Ejecutando...' : 'Ejecutar Una Vez'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStatus}
              disabled={actionLoading}
            >
              Actualizar Estado
            </Button>
          </Stack>

          {!status?.connected && (
            <Alert severity="warning" sx={{ mt: 3 }}>
              <AlertTitle>Cuenta No Conectada</AlertTitle>
              La cuenta del bot no está conectada. Por favor, conecta la cuenta del bot en el Dashboard antes de iniciar.
            </Alert>
          )}
        </Card>

        {/* Information */}
        <Alert severity="info">
          <AlertTitle>Acerca del Control del Bot</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li><strong>Iniciar Bot</strong>: Ejecuta el bot continuamente en segundo plano</li>
            <li><strong>Detener Bot</strong>: Detiene el proceso en segundo plano</li>
            <li><strong>Ejecutar Una Vez</strong>: Procesa tweets una vez sin monitoreo continuo</li>
          </Box>
        </Alert>
      </Stack>
    </Container>
  );
}
