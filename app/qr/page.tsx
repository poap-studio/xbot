/**
 * Public Dynamic QR Code Page
 * Displays a customizable QR code page with logo, background, and POAP artwork
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Container, Grid } from '@mui/material';
import Image from 'next/image';

interface PageConfig {
  logoUrl: string | null;
  backgroundUrl: string | null;
  customText: string | null;
  poapArtworkUrl: string | null;
  poapEventName: string | null;
}

export default function DynamicQrPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load
    fetchPageConfig();
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
  }, []);

  const fetchPageConfig = async () => {
    try {
      const response = await fetch('/api/qr/page-config');
      const data = await response.json();

      if (response.ok) {
        setPageConfig(data);
      }
    } catch (error) {
      console.error('Error fetching page config:', error);
      // Don't show error - just use defaults
    }
  };

  const checkForNewCode = async () => {
    if (!currentCode) {
      return;
    }

    try {
      const response = await fetch('/api/qr/current-code');
      const data = await response.json();

      if (response.ok && data.code && data.code !== currentCode) {
        console.log('New code detected via polling. Old:', currentCode, 'New:', data.code);
        fetchQrCode();
      }
    } catch (error) {
      console.debug('Polling check error (expected):', error);
    }
  };

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
        position: 'relative',
        overflow: 'hidden',
        // Background image
        ...(pageConfig?.backgroundUrl && {
          backgroundImage: `url(${pageConfig.backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }),
        // Fallback background
        bgcolor: pageConfig?.backgroundUrl ? 'transparent' : 'background.default',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Optional overlay for better text readability */}
      {pageConfig?.backgroundUrl && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 0,
          }}
        />
      )}

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 3, sm: 4, md: 5 },
        }}
      >
        {/* Logo */}
        {pageConfig?.logoUrl && (
          <Box
            sx={{
              mb: 2,
              maxWidth: { xs: '200px', sm: '250px', md: '300px' },
              width: '100%',
            }}
          >
            <img
              src={pageConfig.logoUrl}
              alt="Logo"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '150px',
                objectFit: 'contain',
              }}
            />
          </Box>
        )}

        {/* Main Content: POAP Artwork + QR Code */}
        <Grid
          container
          spacing={{ xs: 3, sm: 4, md: 6 }}
          justifyContent="center"
          alignItems="center"
          sx={{ maxWidth: '900px' }}
        >
          {/* POAP Artwork */}
          {pageConfig?.poapArtworkUrl && (
            <Grid item xs={12} sm={6} md={5}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: { xs: '250px', sm: '300px', md: '350px' },
                    aspectRatio: '1',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    boxShadow: 6,
                    bgcolor: 'white',
                  }}
                >
                  <img
                    src={pageConfig.poapArtworkUrl}
                    alt={pageConfig.poapEventName || 'POAP'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
                {pageConfig.poapEventName && (
                  <Typography
                    variant="h6"
                    sx={{
                      color: pageConfig?.backgroundUrl ? 'white' : 'text.primary',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: pageConfig?.backgroundUrl ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                    }}
                  >
                    {pageConfig.poapEventName}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}

          {/* QR Code with Custom Text Overlay */}
          <Grid item xs={12} sm={6} md={pageConfig?.poapArtworkUrl ? 5 : 12}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* Heading (shown if no POAP artwork) */}
              {!pageConfig?.poapArtworkUrl && (
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    mb: 2,
                    color: pageConfig?.backgroundUrl ? 'white' : 'text.primary',
                    textShadow: pageConfig?.backgroundUrl ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                    textAlign: 'center',
                  }}
                >
                  Scan to Tweet
                </Typography>
              )}

              {qrDataUrl && (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  {/* QR Code */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: { xs: 280, sm: 320, md: 380 },
                      height: { xs: 280, sm: 320, md: 380 },
                      bgcolor: 'white',
                      p: 2,
                      borderRadius: 2,
                      boxShadow: 6,
                    }}
                  >
                    <Image
                      src={qrDataUrl}
                      alt="Dynamic QR Code"
                      width={400}
                      height={400}
                      style={{ width: '100%', height: '100%' }}
                      priority
                    />
                  </Box>

                  {/* Custom Text Overlay */}
                  {pageConfig?.customText && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.85)',
                        color: 'white',
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        boxShadow: 4,
                        minWidth: '80%',
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 'bold',
                          fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                        }}
                      >
                        {pageConfig.customText}
                      </Typography>
                    </Box>
                  )}

                  {/* Default text if no custom text */}
                  {!pageConfig?.customText && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 3,
                        textAlign: 'center',
                        color: pageConfig?.backgroundUrl ? 'white' : 'text.secondary',
                        textShadow: pageConfig?.backgroundUrl ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                      }}
                    >
                      Scan this QR code to share on Twitter
                    </Typography>
                  )}
                </Box>
              )}

              {/* Updating indicator */}
              {loading && qrDataUrl && (
                <Typography
                  variant="caption"
                  sx={{
                    color: pageConfig?.backgroundUrl ? 'white' : 'text.secondary',
                    textShadow: pageConfig?.backgroundUrl ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                  }}
                >
                  Updating...
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
