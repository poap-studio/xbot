/**
 * Delivery Card Component
 * Displays a POAP delivery with claim link
 */

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  Stack,
  Link,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Launch as LaunchIcon,
  Twitter as TwitterIcon,
} from '@mui/icons-material';

export interface DeliveryData {
  id: string;
  tweetId: string;
  mintLink: string;
  qrHash: string;
  deliveredAt: string;
  claimed: boolean;
  claimedAt: string | null;
}

interface DeliveryCardProps {
  delivery: DeliveryData;
}

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(delivery.mintLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClaim = () => {
    window.open(delivery.mintLink, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              POAP Delivery
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Delivered {formatDate(delivery.deliveredAt)}
            </Typography>
          </Box>

          {/* Status Badge */}
          {delivery.claimed ? (
            <Chip
              icon={<CheckIcon />}
              label="Claimed"
              color="success"
              size="small"
              sx={{ fontWeight: 'medium' }}
            />
          ) : (
            <Chip
              label="Pending"
              color="warning"
              size="small"
              sx={{ fontWeight: 'medium' }}
            />
          )}
        </Stack>

        {/* Tweet Link */}
        <Box sx={{ mb: 3 }}>
          <Link
            href={`https://twitter.com/anyuser/status/${delivery.tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.875rem',
              textDecoration: 'none',
              color: 'primary.main',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            <TwitterIcon sx={{ fontSize: 16 }} />
            View original tweet
            <LaunchIcon sx={{ fontSize: 14 }} />
          </Link>
        </Box>

        {/* Claim Section */}
        {!delivery.claimed && (
          <Stack spacing={2}>
            <Box
              sx={{
                bgcolor: 'background.default',
                borderRadius: 1,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, fontWeight: 'medium' }}
              >
                Claim Link
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={delivery.mintLink}
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleCopy}
                        edge="end"
                        size="small"
                        sx={{
                          color: copied ? 'success.main' : 'text.secondary',
                        }}
                      >
                        {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={handleClaim}
              endIcon={<LaunchIcon />}
              sx={{
                py: 1.5,
                fontWeight: 'bold',
                textTransform: 'none',
              }}
            >
              Claim POAP Now
            </Button>
          </Stack>
        )}

        {/* Claimed Info */}
        {delivery.claimed && delivery.claimedAt && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Claimed on {formatDate(delivery.claimedAt)}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
