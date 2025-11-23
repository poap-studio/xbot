/**
 * Admin Login Page
 * Sign in with Twitter to access admin panel
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CircularProgress,
} from '@mui/material';
import { Twitter as TwitterIcon } from '@mui/icons-material';

function AdminLoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  useEffect(() => {
    // If already authenticated, check if user is admin
    if (status === 'authenticated' && session?.user) {
      const adminUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME?.toLowerCase();
      const userUsername = session.user.username?.toLowerCase();

      if (adminUsername && adminUsername === userUsername) {
        // User is admin, redirect to admin panel
        router.push(callbackUrl);
      } else {
        // User is not admin, redirect to unauthorized page
        router.push('/admin/unauthorized');
      }
    }
  }, [status, session, router, callbackUrl]);

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
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

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
            🔐
          </Typography>
          <Typography variant="h3" gutterBottom>
            Admin Access
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in with your authorized Twitter account to access the admin panel
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<TwitterIcon />}
            onClick={() => signIn('twitter', { callbackUrl })}
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
            Only authorized administrators can access this panel
          </Typography>
        </Card>
      </Container>
    </Box>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
