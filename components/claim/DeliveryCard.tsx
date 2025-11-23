/**
 * Delivery Card Component
 * Displays a POAP achievement with claim link
 */

'use client';

import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  Stack,
  Link,
  Alert,
} from '@mui/material';
import {
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
              POAP Achievement
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Earned {formatDate(delivery.deliveredAt)}
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
