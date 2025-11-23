/**
 * Hidden Codes Management Page
 * Manage codes that users must include in their tweets to be eligible
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface HiddenCodeStats {
  total: number;
  used: number;
  available: number;
}

export default function HiddenCodesPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<HiddenCodeStats>({
    total: 0,
    used: 0,
    available: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codes, setCodes] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/hidden-codes/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!codes.trim()) {
      setError('Please enter at least one code');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const codeList = codes
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const response = await fetch('/api/admin/hidden-codes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codes: codeList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload codes');
      }

      setSuccess(
        `${data.added} codes added successfully (${data.duplicates} duplicates skipped)`
      );
      setCodes('');
      setShowUploadDialog(false);
      await fetchStats();
    } catch (error) {
      console.error('Error uploading codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload codes');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/hidden-codes/delete-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete codes');
      }

      setSuccess(`${data.deleted} codes deleted successfully`);
      setShowDeleteDialog(false);
      await fetchStats();
    } catch (error) {
      console.error('Error deleting codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete codes');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadCSV = () => {
    window.location.href = '/api/admin/hidden-codes/csv';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Hidden Codes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage the hidden codes that users must include in their tweets to be eligible
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Stats */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Total Codes
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {stats.total}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Available
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {stats.available}
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
              Used
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {stats.used}
            </Typography>
          </Card>
        </Box>

        {/* Actions */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Actions
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowUploadDialog(true)}
              fullWidth
            >
              Upload Codes
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCSV}
              disabled={stats.total === 0}
              fullWidth
            >
              Download CSV
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStats}
              fullWidth
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
              disabled={stats.total === 0}
              fullWidth
            >
              Delete All
            </Button>
          </Stack>
        </Card>

        {/* Info */}
        <Alert severity="info">
          <AlertTitle>What are Hidden Codes?</AlertTitle>
          Hidden Codes are unique codes that users must include in their tweet text
          (along with the configured hashtag and an image) to be eligible to receive a POAP.
          <br /><br />
          <strong>Flow:</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>User tweets: hashtag + hidden code + image</li>
            <li>Bot verifies that the code exists and hasn't been used</li>
            <li>If valid, assigns a QR code and responds with the mint link</li>
            <li>The code is marked as used and cannot be reused</li>
          </ul>
        </Alert>
      </Stack>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => !uploading && setShowUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Hidden Codes</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the codes, one per line. Duplicate codes will be automatically skipped.
            </Typography>
            <TextField
              multiline
              rows={10}
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="CODE001&#10;CODE002&#10;CODE003&#10;..."
              fullWidth
              sx={{ fontFamily: 'monospace' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !codes.trim()}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload Codes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => !deleting && setShowDeleteDialog(false)}
        maxWidth="xs"
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to delete ALL hidden codes ({stats.total} codes)?
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAll}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
