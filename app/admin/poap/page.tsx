/**
 * POAP Configuration Page
 * Configure event settings and reply templates
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Paper,
} from '@mui/material';
import { Save as SaveIcon, Upload as UploadIcon } from '@mui/icons-material';

interface PoapConfig {
  eventId: string;
  eventName: string;
  searchQuery: string;
  replyEligible: string;
  replyNotEligible: string;
}

interface CodeUploadStats {
  total: number;
  used: number;
  available: number;
}

export default function PoapConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [config, setConfig] = useState<PoapConfig>({
    eventId: '',
    eventName: '',
    searchQuery: '',
    replyEligible: '',
    replyNotEligible: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [codeStats, setCodeStats] = useState<CodeUploadStats>({
    total: 0,
    used: 0,
    available: 0,
  });

  useEffect(() => {
    fetchConfig();
    fetchCodeStats();
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
        eventName: data.eventName || '',
        searchQuery: data.searchQuery || '',
        replyEligible: data.replyEligible || '',
        replyNotEligible: data.replyNotEligible || '',
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      setError(error instanceof Error ? error.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchCodeStats = async () => {
    try {
      const response = await fetch('/api/admin/valid-codes/upload');
      const data = await response.json();

      if (response.ok) {
        setCodeStats(data);
      }
    } catch (error) {
      console.error('Error fetching code stats:', error);
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
        body: JSON.stringify({
          eventId: config.eventId,
          searchQuery: config.searchQuery,
          replyTemplate: config.replyEligible, // API expects replyTemplate
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = useCallback(async () => {
    if (!csvFile) {
      setError('Por favor, selecciona un archivo CSV');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Read CSV file
      const text = await csvFile.text();

      // Parse CSV (simple: one code per line or comma-separated)
      const codes = text
        .split(/[\n,]/)
        .map((code) => code.trim())
        .filter((code) => code.length > 0);

      if (codes.length === 0) {
        throw new Error('El archivo CSV no contiene códigos válidos');
      }

      // Upload codes
      const response = await fetch('/api/admin/valid-codes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codes,
          replaceExisting: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload codes');
      }

      setSuccess(`${data.inserted} códigos cargados correctamente`);
      setCsvFile(null);
      fetchCodeStats(); // Refresh stats

      // Clear file input
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar códigos');
    } finally {
      setUploading(false);
    }
  }, [csvFile]);

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
            Configura el evento, hashtag y mensajes de respuesta del bot
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

        {/* Main Configuration */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Configuración del Evento
          </Typography>

          <Stack spacing={3}>
            {/* Event ID */}
            <TextField
              fullWidth
              label="POAP Event ID"
              value={config.eventId}
              onChange={(e) => setConfig({ ...config, eventId: e.target.value })}
              placeholder="12345"
              helperText="El ID del evento POAP a distribuir"
            />

            {/* Hashtag / Search Query */}
            <TextField
              fullWidth
              label="Hashtag a Buscar"
              value={config.searchQuery}
              onChange={(e) => setConfig({ ...config, searchQuery: e.target.value })}
              placeholder="#MiEvento"
              helperText="El hashtag que el bot buscará en Twitter (ej: #POAP, #MiEvento)"
            />
          </Stack>
        </Card>

        {/* Reply Messages */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Mensajes de Respuesta
          </Typography>

          <Stack spacing={3}>
            {/* Reply for Eligible Tweets */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Mensaje para Tweets Elegibles"
              value={config.replyEligible}
              onChange={(e) => setConfig({ ...config, replyEligible: e.target.value })}
              placeholder="¡Felicidades! Has compartido el código correcto. Reclama tu POAP aquí: {{claimUrl}}"
              helperText={
                <>
                  Mensaje cuando el tweet tiene código válido e imagen. Usa{' '}
                  <Typography component="span" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5 }}>
                    {'{{claimUrl}}'}
                  </Typography>{' '}
                  como placeholder para el enlace de claim
                </>
              }
            />

            {/* Reply for Non-Eligible Tweets */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Mensaje para Tweets No Elegibles"
              value={config.replyNotEligible}
              onChange={(e) => setConfig({ ...config, replyNotEligible: e.target.value })}
              placeholder="Gracias por tu interés. Asegúrate de incluir un código válido y una imagen en tu tweet."
              helperText="Mensaje cuando el tweet NO cumple los requisitos (sin código válido o sin imagen)"
            />
          </Stack>
        </Card>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* CSV Upload Section */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Códigos Válidos
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Carga un archivo CSV con los códigos que el bot debe buscar en los tweets. Los códigos pueden estar separados por comas o en líneas diferentes.
          </Typography>

          {/* Code Stats */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={4} justifyContent="space-around">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {codeStats.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {codeStats.available}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Disponibles
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.disabled' }}>
                  {codeStats.used}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Usados
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* File Upload */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              sx={{ flexShrink: 0 }}
            >
              Seleccionar CSV
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCsvFile(file);
                  }
                }}
              />
            </Button>

            {csvFile && (
              <Typography variant="body2" sx={{ flex: 1 }}>
                {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
              </Typography>
            )}

            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
              onClick={handleCsvUpload}
              disabled={!csvFile || uploading}
            >
              {uploading ? 'Cargando...' : 'Cargar Códigos'}
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Formatos soportados: códigos separados por comas o saltos de línea
          </Typography>
        </Card>
      </Stack>
    </Container>
  );
}
