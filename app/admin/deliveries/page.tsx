/**
 * Deliveries Monitoring Page
 * View and monitor all POAP deliveries with project filtering
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
  Autocomplete,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Twitter as TwitterIcon,
} from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  poapEventId: string;
}

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
  project: Project;
}

export default function DeliveriesPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, filter, search, selectedProject]);

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

      // Extract unique projects
      const uniqueProjects = Array.from(
        new Map(
          data.deliveries.map((d: Delivery) => [d.project.id, d.project])
        ).values()
      ) as Project[];
      setProjects(uniqueProjects);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];

    // Apply project filter
    if (selectedProject) {
      filtered = filtered.filter((d) => d.project.id === selectedProject.id);
    }

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
          d.qrHash.toLowerCase().includes(searchLower) ||
          d.project.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDeliveries(filtered);
  };

  const handleExportCSV = () => {
    window.location.href = '/api/admin/deliveries/csv';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Drops
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor all POAP deliveries across projects
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            action={
              <Button color="inherit" size="small" onClick={fetchDeliveries}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Filters Card */}
        <Card sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Project Filter */}
            <Autocomplete
              options={projects}
              getOptionLabel={(option) => option.name}
              value={selectedProject}
              onChange={(_, newValue) => setSelectedProject(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Project / POAP"
                  placeholder="Select a project to filter..."
                  InputLabelProps={{ shrink: true }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Event ID: {option.poapEventId}
                    </Typography>
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />

            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search by user, tweet ID, QR hash, or project name..."
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
                  All ({deliveries.filter(d => !selectedProject || d.project.id === selectedProject.id).length})
                </ToggleButton>
                <ToggleButton value="claimed">
                  Claimed ({deliveries.filter(d => d.claimed && (!selectedProject || d.project.id === selectedProject.id)).length})
                </ToggleButton>
                <ToggleButton value="unclaimed">
                  Pending ({deliveries.filter(d => !d.claimed && (!selectedProject || d.project.id === selectedProject.id)).length})
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
                <TableCell sx={{ fontWeight: 'bold' }}>POAP / Project</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tweet</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>QR Hash</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Delivered At</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedProject
                        ? `No deliveries found for "${selectedProject.name}"`
                        : 'No deliveries found'}
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
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {delivery.project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Event: {delivery.project.poapEventId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <MuiLink
                        href={`https://twitter.com/${delivery.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontWeight: 'medium',
                        }}
                      >
                        <TwitterIcon fontSize="small" />
                        @{delivery.username}
                      </MuiLink>
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
                        {delivery.qrHash.substring(0, 10)}...
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {new Date(delivery.deliveredAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(delivery.deliveredAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {delivery.claimed ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Claimed"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<HourglassEmptyIcon />}
                          label="Pending"
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
                  {filteredDeliveries.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedProject ? 'Filtered Deliveries' : 'Total Deliveries'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {filteredDeliveries.filter((d) => d.claimed).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Claimed
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {filteredDeliveries.filter((d) => !d.claimed).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                  {filteredDeliveries.length > 0
                    ? Math.round((filteredDeliveries.filter((d) => d.claimed).length / filteredDeliveries.length) * 100)
                    : 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Claim Rate
                </Typography>
              </Box>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
