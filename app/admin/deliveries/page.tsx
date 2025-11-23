/**
 * Deliveries Monitoring Page
 * View and monitor all POAP deliveries
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Link as MuiLink,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

interface Delivery {
  id: string;
  twitterUserId: string;
  username: string;
  tweetId: string;
  mintLink: string;
  qrHash: string;
  deliveredAt: string;
  claimed: boolean;
  claimedAt: string | null;
}

export default function DeliveriesPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, filter, search]);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/deliveries');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deliveries');
      }

      setDeliveries(data.deliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];

    // Apply status filter
    if (filter === 'claimed') {
      filtered = filtered.filter((d) => d.claimed);
    } else if (filter === 'unclaimed') {
      filtered = filtered.filter((d) => !d.claimed);
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.username.toLowerCase().includes(searchLower) ||
          d.tweetId.includes(searchLower) ||
          d.qrHash.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDeliveries(filtered);
  };

  const handleExportCSV = () => {
    window.location.href = '/api/admin/deliveries/csv';
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Entregas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitorea todas las entregas de POAP
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Exportar CSV
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            action={
              <Button color="inherit" size="small" onClick={fetchDeliveries}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Filters Card */}
        <Card sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Buscar por usuario, ID de tweet o QR hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            {/* Status Filter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FilterListIcon sx={{ color: 'text.secondary' }} />
              <ToggleButtonGroup
                value={filter}
                exclusive
                onChange={(_, newFilter) => {
                  if (newFilter !== null) {
                    setFilter(newFilter);
                  }
                }}
                size="small"
              >
                <ToggleButton value="all">
                  Todas ({deliveries.length})
                </ToggleButton>
                <ToggleButton value="claimed">
                  Reclamadas ({deliveries.filter((d) => d.claimed).length})
                </ToggleButton>
                <ToggleButton value="unclaimed">
                  Pendientes ({deliveries.filter((d) => !d.claimed).length})
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Card>

        {/* Deliveries Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tweet</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>QR Hash</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Entregado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron entregas
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow
                    key={delivery.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        @{delivery.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <MuiLink
                        href={`https://twitter.com/i/web/status/${delivery.tweetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                      >
                        {delivery.tweetId}
                      </MuiLink>
                    </TableCell>
                    <TableCell>
                      <Box
                        component="code"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {delivery.qrHash.substring(0, 8)}...
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {new Date(delivery.deliveredAt).toLocaleDateString('es-ES')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(delivery.deliveredAt).toLocaleTimeString('es-ES')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {delivery.claimed ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Reclamado"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<HourglassEmptyIcon />}
                          label="Pendiente"
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Stats Summary */}
        {deliveries.length > 0 && (
          <Card sx={{ p: 2, bgcolor: 'action.hover' }}>
            <Stack direction="row" spacing={4} justifyContent="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {deliveries.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Entregas
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {deliveries.filter((d) => d.claimed).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reclamados
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {deliveries.filter((d) => !d.claimed).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pendientes
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                  {deliveries.length > 0
                    ? Math.round((deliveries.filter((d) => d.claimed).length / deliveries.length) * 100)
                    : 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tasa de Reclamo
                </Typography>
              </Box>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
