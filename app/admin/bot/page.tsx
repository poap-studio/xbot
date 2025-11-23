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

      setSuccess('Configuración guardada correctamente');
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
            Configuración del Bot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            El bot está siempre activo escuchando el hashtag configurado y respondiendo automáticamente
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <AlertTitle sx={{ fontWeight: 'bold' }}>Cuenta del Bot No Conectada</AlertTitle>
                <Typography variant="body2">
                  Necesitas conectar una cuenta de Twitter con permisos de escritura para que el bot pueda responder automáticamente a los tweets.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="error"
                size="large"
                href="/api/auth/bot-twitter"
                sx={{ whiteSpace: 'nowrap', minWidth: 200 }}
              >
                Conectar Cuenta de Twitter
              </Button>
            </Stack>
          </Alert>
        )}

        {/* Bot Status Card */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Estado del Bot
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<ScheduleIcon />}
                label="Ejecuta cada minuto"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={config.botConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                label={config.botConnected ? 'Conectado' : 'Desconectado'}
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
                Cuenta del Bot
              </Typography>
              {config.botConnected && config.botUsername ? (
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  @{config.botUsername}
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
                {config.lastRun
                  ? new Date(config.lastRun).toLocaleString('es-ES')
                  : 'Nunca'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Procesados Hoy
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {config.processedToday || 0} tweets
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Errores Hoy
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
              Actualizar Estado
            </Button>
          </Box>
        </Card>

        {/* Configuration Form */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Configuración de Monitoreo
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Hashtag a Monitorear"
              value={config.twitterHashtag}
              onChange={(e) => setConfig({ ...config, twitterHashtag: e.target.value })}
              fullWidth
              placeholder="#POAP"
              helperText="El bot buscará tweets con este hashtag. Incluye el símbolo #"
            />

            <Divider />

            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Mensajes de Respuesta
            </Typography>

            <TextField
              label="Mensaje para Tweets Elegibles"
              value={config.botReplyEligible}
              onChange={(e) => setConfig({ ...config, botReplyEligible: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="¡Felicidades! Has compartido el código correcto. Reclama tu POAP aquí: {{claimUrl}}"
              helperText="Usa {{claimUrl}} donde quieres que aparezca el enlace de reclamación"
            />

            <TextField
              label="Mensaje para Tweets No Elegibles"
              value={config.botReplyNotEligible}
              onChange={(e) => setConfig({ ...config, botReplyNotEligible: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Gracias por tu interés. Asegúrate de incluir un código válido y una imagen en tu tweet."
              helperText="Este mensaje se enviará cuando el tweet no cumpla los requisitos"
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

        {/* Information */}
        <Alert severity="info">
          <AlertTitle>¿Cómo Funciona el Bot?</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            <li>El bot se ejecuta automáticamente <strong>cada minuto</strong> mediante un cron job de Vercel</li>
            <li>Busca tweets nuevos que contengan el <strong>hashtag configurado</strong></li>
            <li>Verifica que el tweet tenga un <strong>código válido</strong> y una <strong>imagen</strong></li>
            <li>Si es elegible, responde automáticamente con el mensaje configurado y un enlace de reclamación</li>
            <li>Si no es elegible, responde con el mensaje de "no elegible"</li>
          </Box>
        </Alert>
      </Stack>
    </Container>
  );
}
