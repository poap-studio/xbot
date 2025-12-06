/**
 * Dashboard Page
 * Authenticated users can view and claim their POAP deliveries
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DeliveryCard, type DeliveryData } from '@/components/claim/DeliveryCard';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';

interface DeliveriesResponse {
  success: boolean;
  deliveries: DeliveryData[];
  total: number;
  claimed: number;
  unclaimed: number;
  error?: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, claimed: 0, unclaimed: 0 });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDeliveries();
    }
  }, [status]);

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claim/deliveries');
      const data: DeliveriesResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deliveries');
      }

      // Filter to show only unclaimed deliveries
      const unclaimedDeliveries = data.deliveries.filter((d: DeliveryData) => !d.claimed);
      setDeliveries(unclaimedDeliveries);
      setStats({
        total: data.total,
        claimed: data.claimed,
        unclaimed: data.unclaimed,
      });
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      </Box>
    );
  }

  // Authenticated - show deliveries
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              My POAP Achievements
            </Typography>
            {session?.user && (
              <Typography variant="caption" color="text.secondary">
                Signed in as @{session.user.username}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => signOut({ callbackUrl: '/' })}
            sx={{
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              }
            }}
          >
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      {/* Spacer for fixed AppBar */}
      <Toolbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
            <Button size="small" onClick={fetchDeliveries} sx={{ ml: 2 }}>
              Try again
            </Button>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Loading your achievements...</Typography>
          </Box>
        )}

        {/* No Deliveries */}
        {!loading && !error && deliveries.length === 0 && (
          <Card sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h1" sx={{ fontSize: '4rem', mb: 3 }}>
              ✨
            </Typography>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              No pending POAPs to claim
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You have no POAPs waiting to be claimed. Post a tweet with the campaign hashtag and code to earn your next POAP!
            </Typography>
          </Card>
        )}

        {/* Deliveries Grid */}
        {!loading && deliveries.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {deliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
