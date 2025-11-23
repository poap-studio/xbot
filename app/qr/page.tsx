/**
 * Public Dynamic QR Code Page
 * Displays a QR code that auto-updates when scanned
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';

export default function DynamicQrPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Initial QR load
    fetchQrCode();

    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/qr/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.code !== currentCode) {
        console.log('QR code updated via SSE, fetching new QR...');
        fetchQrCode();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [currentCode]);

  const fetchQrCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/qr/generate');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrDataUrl(data.qrDataUrl);
      setCurrentCode(data.code);
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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Scan to Tweet
      </Typography>

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
