/**
 * Admin Unauthorized Page
 * Shown when a user tries to access admin panel without authorization
 */

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  Stack,
} from '@mui/material';
import { Block as BlockIcon, Home as HomeIcon, Logout as LogoutIcon } from '@mui/icons-material';

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255, 52, 52, 0.1) 0%, transparent 50%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px solid',
            borderColor: 'error.main',
            bgcolor: 'background.paper',
          }}
        >
          <BlockIcon sx={{ fontSize: '4rem', color: 'error.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You do not have permission to access the admin panel.
          </Typography>
          {session?.user && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Signed in as <strong>@{session.user.username}</strong>
            </Typography>
          )}

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => router.push('/')}
              fullWidth
            >
              Go to Home
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<LogoutIcon />}
              onClick={handleSignOut}
              fullWidth
            >
              Sign Out
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            If you believe this is an error, please contact the administrator
          </Typography>
        </Card>
      </Container>
    </Box>
  );
}
