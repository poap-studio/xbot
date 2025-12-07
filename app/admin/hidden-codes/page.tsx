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
  const [codes, setCodes] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Read file (CSV or TXT with one code per line)
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    // Skip first line (header) and extract codes
    const extractedCodes = lines
      .slice(1) // Skip header row
      .map(line => line.trim())
      .filter(code => code.length > 0);

    setCodes(extractedCodes.join('\n'));
  };

  const handleUpload = async () => {
    if (!codes.trim()) {
      setError('Please upload a CSV file with codes');
      return;
    }

    setUploading(true);
    setError(null);

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

      setCodes('');
      setSelectedFile(null);
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

    try {
      const response = await fetch('/api/admin/hidden-codes/delete-all', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete codes');
      }

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
          <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
            <li>User tweets: hashtag + hidden code + image</li>
            <li>Bot verifies that the code exists and hasn't been used</li>
            <li>If valid, assigns a QR code and responds with the mint link</li>
            <li>The code is marked as used and cannot be reused</li>
          </ul>
          <strong>CSV File Format:</strong>
          <br />
          Upload a CSV file with one code per line. The first row will be automatically skipped (header):
          <br />
          <code style={{ display: 'block', marginTop: '4px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
            code<br />
            CODE001<br />
            CODE002<br />
            CODE003
          </code>
        </Alert>
      </Stack>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => {
          if (!uploading) {
            setShowUploadDialog(false);
            setCodes('');
            setSelectedFile(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Hidden Codes</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload a CSV file with one code per line. The first row (header) will be skipped automatically. Duplicate codes will be automatically skipped.
            </Typography>

            {/* File Upload */}
            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {selectedFile ? selectedFile.name : 'Choose CSV File'}
                <input
                  type="file"
                  accept=".csv,.txt"
                  hidden
                  onChange={handleFileSelect}
                />
              </Button>
              {selectedFile && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
                  ✓ {codes.split('\n').filter(c => c.trim()).length} codes ready to upload
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowUploadDialog(false);
              setCodes('');
              setSelectedFile(null);
            }}
            disabled={uploading}
          >
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
