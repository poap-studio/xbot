/**
 * Project-Specific Dynamic QR Code Page
 * Displays a QR code for a specific project that auto-updates when scanned
 */

'use client';

import { useEffect, useState, useRef, use } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';

export default function ProjectQrPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial QR load
    fetchQrCode();

    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/qr/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE event received:', data);

      if (data.type === 'update') {
        console.log('QR code scan detected via SSE, fetching new QR...');
        fetchQrCode();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    // Polling backup: Check for new codes every 3 seconds
    // This ensures the QR updates even if SSE doesn't work in serverless environments
    pollingIntervalRef.current = setInterval(() => {
      checkForNewCode();
    }, 3000);

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [projectId]);

  const checkForNewCode = async () => {
    if (!currentCode) {
      // Don't poll until we have an initial code
      return;
    }

    try {
      // Fetch the current available code without generating a new QR
      const response = await fetch(`/api/qr/current-code?projectId=${projectId}`);
      const data = await response.json();

      if (response.ok && data.code && data.code !== currentCode) {
        console.log('New code detected via polling. Old:', currentCode, 'New:', data.code);
        fetchQrCode();
      }
    } catch (error) {
      // Silently fail - this is just a backup mechanism
      console.debug('Polling check error (expected):', error);
    }
  };

  const fetchQrCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/qr/generate?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrDataUrl(data.qrDataUrl);
      setCurrentCode(data.code);
      if (data.projectName) {
        setProjectName(data.projectName);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setError(error instanceof Error ? error.message : 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrDataUrl) {
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
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
        Scan to Tweet
      </Typography>

      {projectName && (
        <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 3 }}>
          {projectName}
        </Typography>
      )}

      {qrDataUrl && (
        <Box
          sx={{
            position: 'relative',
            width: 400,
            height: 400,
            bgcolor: 'white',
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Image
            src={qrDataUrl}
            alt="Dynamic QR Code"
            width={368}
            height={368}
            style={{ width: '100%', height: '100%' }}
            priority
          />
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Scan this QR code to share on Twitter
      </Typography>

      {loading && qrDataUrl && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Updating...
        </Typography>
      )}
    </Box>
  );
}
