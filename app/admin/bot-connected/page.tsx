'use client';

import { useEffect, Suspense } from 'react';
import { Box, Container, Typography, Button, Card, CircularProgress } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';

function BotConnectedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');

  useEffect(() => {
    // Auto-close window after 3 seconds if opened as popup
    if (window.opener) {
      const timer = setTimeout(() => {
        window.close();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push('/admin');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ p: 4, textAlign: 'center', width: '100%' }}>
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 2,
            }}
          />

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Success!
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Bot Account Connected
          </Typography>

          {username && (
            <Typography variant="body1" sx={{ mb: 3 }}>
              @{username} has been successfully connected and is now available for use in your projects.
            </Typography>
          )}

          {!username && (
            <Typography variant="body1" sx={{ mb: 3 }}>
              The bot account has been successfully connected and is now available for use in your projects.
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {window.opener
              ? 'This window will close automatically in 3 seconds...'
              : 'You can now close this window and return to the admin panel.'}
          </Typography>

          <Button variant="contained" onClick={handleClose} size="large">
            {window.opener ? 'Close Window' : 'Go to Admin'}
          </Button>
        </Card>
      </Box>
    </Container>
  );
}

export default function BotConnectedPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        </Container>
      }
    >
      <BotConnectedContent />
    </Suspense>
  );
}
