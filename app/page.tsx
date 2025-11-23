/**
 * Home Page / Claim Page
 * Users can sign in with Twitter and view/claim their POAP deliveries
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { DeliveryCard, type DeliveryData } from '@/components/claim/DeliveryCard';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Stack,
} from '@mui/material';
import { Twitter as TwitterIcon, Logout as LogoutIcon } from '@mui/icons-material';

interface DeliveriesResponse {
  success: boolean;
  deliveries: DeliveryData[];
  total: number;
  claimed: number;
  unclaimed: number;
  error?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, claimed: 0, unclaimed: 0 });

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

      setDeliveries(data.deliveries);
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

  // Not authenticated - show login
  if (status === 'unauthenticated') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(101, 52, 255, 0.1) 0%, transparent 50%)',
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              p: 4,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
              🎫
            </Typography>
            <Typography variant="h3" gutterBottom>
              POAP Twitter Bot
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Sign in with Twitter to claim your POAPs
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<TwitterIcon />}
              onClick={() => signIn('twitter')}
              fullWidth
              sx={{
                py: 1.5,
                fontSize: '1.125rem',
                bgcolor: '#1DA1F2',
                '&:hover': {
                  bgcolor: '#1A8CD8',
                },
              }}
            >
              Sign in with Twitter
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
              By signing in, you agree to access your Twitter deliveries
            </Typography>
          </Card>
        </Container>
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
            onClick={() => signOut()}
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
        {/* Stats */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}>
          <Card sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mb: 2 }}>
              Total POAPs
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All your deliveries
            </Typography>
          </Card>
          <Card sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mb: 2 }}>
              Claimed
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
              {stats.claimed}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Successfully collected
            </Typography>
          </Card>
          <Card sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mb: 2 }}>
              Pending
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
              {stats.unclaimed}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ready to claim
            </Typography>
          </Card>
        </Box>

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
              📭
            </Typography>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              No POAP achievements yet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Post a tweet with the campaign hashtag and code to earn your POAP
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
