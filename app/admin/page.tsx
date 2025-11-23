/**
 * Admin Dashboard Page
 * Main page for bot administration
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
} from '@mui/material';
import {
  LocalShipping as DeliveryIcon,
  Link as LinkIcon,
  Twitter as TwitterIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { BotConnection } from '@/components/admin/BotConnection';

interface DashboardStats {
  bot: {
    connected: boolean;
    username?: string;
    lastUsed?: string;
  };
  deliveries: {
    total: number;
    claimed: number;
    unclaimed: number;
    claimRate: number;
  };
  mintLinks: {
    total: number;
    available: number;
    reserved: number;
    claimed: number;
  };
  tweets: {
    total: number;
    eligible: number;
    replied: number;
    pending: number;
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stats');
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
          <Button
            onClick={fetchStats}
            size="small"
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of POAP bot activity
          </Typography>
        </Box>

        {/* Bot Connection */}
        <BotConnection />

        {/* Stats Grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}>
          {/* Deliveries */}
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Deliveries
              </Typography>
              <DeliveryIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.deliveries.total || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats?.deliveries.claimed || 0} claimed ({stats?.deliveries.claimRate.toFixed(1) || 0}%)
            </Typography>
          </Card>

          {/* Mint Links */}
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Mint Links
              </Typography>
              <LinkIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.mintLinks.available || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats?.mintLinks.total || 0} total
            </Typography>
          </Card>

          {/* Eligible Tweets */}
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Eligible Tweets
              </Typography>
              <TwitterIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.tweets.eligible || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats?.tweets.pending || 0} pending response
            </Typography>
          </Card>

          {/* Claim Rate */}
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Claim Rate
              </Typography>
              <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main', opacity: 0.3 }} />
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats?.deliveries.claimRate.toFixed(1) || 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats?.deliveries.claimed || 0} of {stats?.deliveries.total || 0}
            </Typography>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}
