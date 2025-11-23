/**
 * Admin Login Page
 * Password authentication for admin panel
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid password');
        setLoading(false);
        return;
      }

      // Login successful, redirect to admin panel
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

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
            Enter the admin password to access the panel
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="password"
              label="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              sx={{ mb: 3 }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
              disabled={loading || !password}
              fullWidth
              sx={{
                py: 1.5,
                fontSize: '1.125rem',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Box>

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
