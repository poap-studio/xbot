/**
 * Hidden Codes Management Page
 * Manage codes that users must include in their tweets to be eligible
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
  AlertTitle,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface HiddenCodeStats {
  total: number;
  used: number;
  available: number;
}

export default function HiddenCodesPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<HiddenCodeStats>({
    total: 0,
    used: 0,
    available: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codes, setCodes] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/hidden-codes/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!codes.trim()) {
      setError('Por favor ingresa al menos un código');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const codeList = codes
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const response = await fetch('/api/admin/hidden-codes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codes: codeList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload codes');
      }

      setSuccess(
        `${data.added} códigos agregados correctamente (${data.duplicates} duplicados omitidos)`
      );
      setCodes('');
      setShowUploadDialog(false);
      await fetchStats();
    } catch (error) {
      console.error('Error uploading codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload codes');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/hidden-codes/delete-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete codes');
      }

      setSuccess(`${data.deleted} códigos eliminados correctamente`);
      setShowDeleteDialog(false);
      await fetchStats();
    } catch (error) {
      console.error('Error deleting codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete codes');
    } finally {
      setDeleting(false);
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
            Hidden Codes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los códigos ocultos que los usuarios deben incluir en sus tweets para ser elegibles
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

        {/* Stats */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Total Códigos
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {stats.total}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Disponibles
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {stats.available}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Usados
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {stats.used}
            </Typography>
          </Card>
        </Box>

        {/* Actions */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Acciones
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowUploadDialog(true)}
              fullWidth
            >
              Cargar Códigos
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStats}
              fullWidth
            >
              Actualizar
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
              disabled={stats.total === 0}
              fullWidth
            >
              Borrar Todos
            </Button>
          </Stack>
        </Card>

        {/* Info */}
        <Alert severity="info">
          <AlertTitle>¿Qué son los Hidden Codes?</AlertTitle>
          Los Hidden Codes son códigos únicos que los usuarios deben incluir en el texto de su tweet
          (junto con el hashtag configurado y una imagen) para ser elegibles para recibir un POAP.
          <br /><br />
          <strong>Flujo:</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>Usuario tweetea: hashtag + hidden code + imagen</li>
            <li>Bot verifica que el código existe y no ha sido usado</li>
            <li>Si es válido, asigna un QR code y responde con el mint link</li>
            <li>El código se marca como usado y no puede reutilizarse</li>
          </ul>
        </Alert>
      </Stack>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => !uploading && setShowUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cargar Hidden Codes</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ingresa los códigos, uno por línea. Los códigos duplicados serán omitidos automáticamente.
            </Typography>
            <TextField
              multiline
              rows={10}
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="CODE001&#10;CODE002&#10;CODE003&#10;..."
              fullWidth
              sx={{ fontFamily: 'monospace' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !codes.trim()}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          >
            {uploading ? 'Cargando...' : 'Cargar Códigos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => !deleting && setShowDeleteDialog(false)}
        maxWidth="xs"
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            ¿Estás seguro de que quieres eliminar TODOS los hidden codes ({stats.total} códigos)?
            Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteAll}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Eliminando...' : 'Eliminar Todos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
