/**
 * Mint Links Management Page
 * Import and manage POAP mint links
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
  Paper,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';

interface MintLinkStats {
  total: number;
  available: number;
  reserved: number;
  claimed: number;
}

export default function MintLinksPage() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<MintLinkStats | null>(null);
  const [links, setLinks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/mint-links/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!links.trim()) {
      setError('Por favor ingresa al menos un mint link');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const linkArray = links
        .split('\n')
        .map((link) => link.trim())
        .filter((link) => link.length > 0);

      const response = await fetch('/api/admin/mint-links/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: linkArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import links');
      }

      setSuccess(
        `${data.imported} links importados correctamente (${data.duplicates} duplicados omitidos)`
      );
      setLinks('');
      fetchStats();
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error importing links:', error);
      setError(error instanceof Error ? error.message : 'Failed to import links');
    } finally {
      setImporting(false);
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
            Mint Links
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Importa y gestiona los enlaces de mint POAP
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

        {/* Statistics Grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}>
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Total Links
              </Typography>
              <LinkIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {stats?.total || 0}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Disponibles
              </Typography>
              <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {stats?.available || 0}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Reservados
              </Typography>
              <HourglassEmptyIcon sx={{ fontSize: 32, color: 'warning.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {stats?.reserved || 0}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Reclamados
              </Typography>
              <CelebrationIcon sx={{ fontSize: 32, color: 'info.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {stats?.claimed || 0}
            </Typography>
          </Card>
        </Box>

        {/* Import Section */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Importar Mint Links
          </Typography>

          <Stack spacing={3}>
            <TextField
              multiline
              rows={10}
              fullWidth
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://poap.xyz/claim/abc123&#10;https://poap.xyz/claim/def456&#10;https://poap.xyz/claim/ghi789"
              helperText="Ingresa los enlaces de mint POAP, uno por línea. Los duplicados se omitirán automáticamente."
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                onClick={handleImport}
                disabled={importing || !links.trim()}
              >
                {importing ? 'Importando...' : 'Importar Links'}
              </Button>
            </Box>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
