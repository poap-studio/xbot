/**
 * Admin Cron Logs Page
 * View cron job execution history and errors
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
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface CronLog {
  id: string;
  status: string;
  tweetsFound: number;
  processed: number;
  failed: number;
  errorMessage: string | null;
  errorDetails: any;
  executionTime: number | null;
  startedAt: string;
  completedAt: string | null;
}

interface CronLogsData {
  logs: CronLog[];
  stats: {
    total: number;
    last24Hours: number;
    successRate: string;
    byStatus: Record<string, number>;
  };
}

export default function CronLogsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CronLogsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const url =
        filter === 'all'
          ? '/api/admin/cron-logs'
          : `/api/admin/cron-logs?status=${filter}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch cron logs');
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching cron logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'success':
        return <Chip icon={<CheckCircleIcon />} label="Success" color="success" size="small" />;
      case 'error':
        return <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />;
      case 'warning':
        return <Chip icon={<WarningIcon />} label="Warning" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading && !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchLogs}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Logs de Cron Jobs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitorea las ejecuciones automáticas del bot y errores
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Grid */}
        {data && (
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
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                Total Ejecuciones
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {data.stats.total}
              </Typography>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                Últimas 24 Horas
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {data.stats.last24Hours}
              </Typography>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                Tasa de Éxito
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {data.stats.successRate}%
              </Typography>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
                Errores
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {data.stats.byStatus.error || 0}
              </Typography>
            </Card>
          </Box>
        )}

        {/* Filters */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
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
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="success">Exitosos</ToggleButton>
              <ToggleButton value="warning">Advertencias</ToggleButton>
              <ToggleButton value="error">Errores</ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </Stack>
        </Card>

        {/* Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Inicio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Duración</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tweets</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Procesados</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Fallidos</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Detalles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron logs
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <>
                    <TableRow
                      key={log.id}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>{getStatusChip(log.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(log.startedAt).toLocaleDateString('es-ES')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.startedAt).toLocaleTimeString('es-ES')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDuration(log.executionTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.tweetsFound}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                          {log.processed}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'medium' }}>
                          {log.failed}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.errorMessage && (
                          <IconButton
                            size="small"
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          >
                            {expandedLog === log.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                    {log.errorMessage && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                          <Collapse in={expandedLog === log.id} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 3, bgcolor: 'action.hover', m: 2, borderRadius: 1 }}>
                              <Stack spacing={2}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Mensaje de Error:
                                  </Typography>
                                  <Typography variant="body2" color="error">
                                    {log.errorMessage}
                                  </Typography>
                                </Box>
                                {log.errorDetails && (
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                      Detalles:
                                    </Typography>
                                    <Paper
                                      variant="outlined"
                                      sx={{
                                        p: 2,
                                        bgcolor: 'background.paper',
                                        overflow: 'auto',
                                        maxHeight: 300,
                                      }}
                                    >
                                      <Typography
                                        component="pre"
                                        variant="caption"
                                        sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                                      >
                                        {typeof log.errorDetails === 'string'
                                          ? log.errorDetails
                                          : JSON.stringify(log.errorDetails, null, 2)}
                                      </Typography>
                                    </Paper>
                                  </Box>
                                )}
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Container>
  );
}
