/**
 * Home Page - Login
 * Users sign in with Twitter to access their POAP dashboard
 */

'use client';

import { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CircularProgress,
} from '@mui/material';
import { Twitter as TwitterIcon } from '@mui/icons-material';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading' || status === 'authenticated') {
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
          <Typography color="text.secondary">
            {status === 'authenticated' ? 'Redirecting to dashboard...' : 'Loading...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Not authenticated - show login
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
            🏅
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
            onClick={() => signIn('twitter', { callbackUrl: '/dashboard' })}
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
            By signing in, you agree to access your Twitter POAP achievements
          </Typography>
        </Card>
      </Container>
    </Box>
  );
}
