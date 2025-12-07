/**
 * Project Detail Page
 * Manage individual project configuration with tabs
 */

'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CircularProgress,
  Alert,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  QrCode as QrCodeIcon,
  Message as MessageIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Project {
  id: string;
  name: string;
  poapEventId: string;
  poapEditCode: string;
  twitterHashtag: string;
  isActive: boolean;
  allowMultipleClaims: boolean;
  botReplyEligible: string;
  botReplyNotEligible: string;
  botReplyAlreadyClaimed: string;
  qrPageTweetTemplate: string;
  botAccountId: string | null;
  botAccount: {
    id: string;
    username: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// General Tab Component
function GeneralTab({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    twitterHashtag: project.twitterHashtag,
    isActive: project.isActive,
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project');
      }

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Project updated successfully!
        </Alert>
      )}

      <Stack spacing={3}>
        <TextField
          label="Twitter Hashtag"
          value={formData.twitterHashtag}
          onChange={handleChange('twitterHashtag')}
          required
          fullWidth
          helperText="The hashtag to monitor on Twitter (include #)"
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive}
              onChange={handleChange('isActive')}
            />
          }
          label="Active"
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

// POAP Config Tab Component
function POAPConfigTab({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    botReplyEligible: project.botReplyEligible,
    botReplyNotEligible: project.botReplyNotEligible,
    botReplyAlreadyClaimed: project.botReplyAlreadyClaimed,
    qrPageTweetTemplate: project.qrPageTweetTemplate,
    allowMultipleClaims: project.allowMultipleClaims,
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update POAP config');
      }

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating POAP config:', error);
      setError(error instanceof Error ? error.message : 'Failed to update POAP config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        POAP Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure reply messages and claim settings for this POAP drop
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          POAP configuration updated successfully!
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Reply Templates Section */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Reply Templates
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Eligible Reply Message"
              value={formData.botReplyEligible}
              onChange={handleChange('botReplyEligible')}
              required
              fullWidth
              multiline
              rows={3}
              helperText="Reply sent when user is eligible and receives a POAP. Use {username} and {link} as placeholders."
            />

            <TextField
              label="Not Eligible Reply Message"
              value={formData.botReplyNotEligible}
              onChange={handleChange('botReplyNotEligible')}
              required
              fullWidth
              multiline
              rows={3}
              helperText="Reply sent when user is not eligible (invalid code). Use {username} as placeholder."
            />

            <TextField
              label="Already Claimed Reply Message"
              value={formData.botReplyAlreadyClaimed}
              onChange={handleChange('botReplyAlreadyClaimed')}
              required
              fullWidth
              multiline
              rows={3}
              helperText="Reply sent when user already claimed this POAP. Use {username} as placeholder."
            />
          </Stack>
        </Box>

        {/* QR Page Template */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            QR Page Settings
          </Typography>

          <TextField
            label="Tweet Template for QR Page"
            value={formData.qrPageTweetTemplate}
            onChange={handleChange('qrPageTweetTemplate')}
            required
            fullWidth
            multiline
            rows={3}
            helperText="Template for the tweet shown on the QR claim page. Use {hashtag} as placeholder."
          />
        </Box>

        {/* Claim Settings */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Claim Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formData.allowMultipleClaims}
                onChange={handleChange('allowMultipleClaims')}
              />
            }
            label="Allow Multiple Claims"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
            If enabled, users can claim multiple POAPs from this drop. If disabled, users can only claim once.
          </Typography>
        </Box>

        {/* Template Preview */}
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Template Placeholders:
          </Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><code>{'{username}'}</code> - Twitter username (e.g., @john)</li>
            <li><code>{'{link}'}</code> - POAP claim link</li>
            <li><code>{'{hashtag}'}</code> - Project hashtag</li>
          </ul>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

// Valid Codes Tab Component
function ValidCodesTab({ project }: { project: Project }) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, used: 0, available: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
      const response = await fetch(`/api/admin/hidden-codes/stats?projectId=${project.id}`);
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

    const text = await file.text();
    const lines = text.split(/\r?\n/);

    const extractedCodes = lines
      .slice(1)
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
        body: JSON.stringify({ codes: codeList, projectId: project.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload codes');
      }

      setSuccess(
        `${data.added} codes added successfully (${data.duplicates} duplicates skipped)`
      );
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
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/hidden-codes/delete-all?projectId=${project.id}`, {
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
    window.location.href = `/api/admin/hidden-codes/csv?projectId=${project.id}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Valid Codes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage the hidden codes that users must include in their tweets to be eligible
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Stats */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
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
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
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
        <AlertTitle>What are Valid Codes?</AlertTitle>
        Valid Codes are unique codes that users must include in their tweet text
        (along with the configured hashtag) to be eligible to receive a POAP.
        <br /><br />
        <strong>Flow:</strong>
        <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
          <li>User tweets: hashtag + hidden code</li>
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
        <DialogTitle>Upload Valid Codes</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload a CSV file with one code per line. The first row (header) will be skipped automatically. Duplicate codes will be automatically skipped.
            </Typography>

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
            Are you sure you want to delete ALL valid codes ({stats.total} codes)?
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
    </Box>
  );
}

// Mint Links Tab Component
function MintLinksTab({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [loading, setLoading] = useState(true);
  const [loadingQRs, setLoadingQRs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, claimed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    poapEventId: project.poapEventId,
    poapEditCode: project.poapEditCode,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // First, update the POAP settings
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update POAP settings');
      }

      // Then, fetch the POAP event name and update project name
      try {
        const nameResponse = await fetch(`/api/admin/projects/${project.id}/fetch-poap-name`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poapEventId: formData.poapEventId,
            poapEditCode: formData.poapEditCode,
          }),
        });

        const nameData = await nameResponse.json();

        if (nameResponse.ok && nameData.name) {
          setSuccess(`POAP settings updated successfully! Project renamed to: "${nameData.name}"`);
        } else {
          setSuccess('POAP settings updated successfully!');
        }
      } catch (nameError) {
        console.warn('Failed to fetch POAP event name:', nameError);
        setSuccess('POAP settings updated successfully!');
      }

      onUpdate();
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating POAP settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to update POAP settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/qr-codes/stats?projectId=${project.id}`);
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

  const handleLoadFromPOAP = async () => {
    setLoadingQRs(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/qr-codes/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: project.poapEventId,
          editCode: project.poapEditCode,
          projectId: project.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load QR codes');
      }

      setSuccess(
        `Successfully loaded ${data.loaded} QR codes (${data.duplicates} duplicates skipped)`
      );
      await fetchStats();
    } catch (error) {
      console.error('Error loading QR codes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load QR codes from POAP API');
    } finally {
      setLoadingQRs(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Mint Links
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Load and manage POAP mint links for this project
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* POAP Settings */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          POAP Event Settings
        </Typography>
        <Stack spacing={3}>
          <TextField
            label="POAP Event ID"
            value={formData.poapEventId}
            onChange={handleChange('poapEventId')}
            required
            fullWidth
            helperText="The POAP event ID from poap.xyz"
          />

          <TextField
            label="POAP Edit Code"
            value={formData.poapEditCode}
            onChange={handleChange('poapEditCode')}
            required
            fullWidth
            type="password"
            helperText="The edit code to load mint links from POAP API"
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save POAP Settings'}
            </Button>
          </Box>
        </Stack>
      </Card>

      {/* Stats */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}>
        <Card sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
            Total Mint Links
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
            Reserved
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            {stats.reserved}
          </Typography>
        </Card>

        <Card sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'medium' }}>
            Claimed
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'info.main' }}>
            {stats.claimed}
          </Typography>
        </Card>
      </Box>

      {/* Actions */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Actions
        </Typography>

        <Stack spacing={2}>
          <Button
            variant="contained"
            color="success"
            startIcon={<QrCodeIcon />}
            onClick={() => window.open(`/qr/${project.id}`, '_blank')}
            fullWidth
          >
            Open Dynamic QR Page
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={loadingQRs ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleLoadFromPOAP}
            disabled={loadingQRs}
            fullWidth
          >
            {loadingQRs ? 'Loading Mint Links from POAP...' : 'Load Mint Links from POAP API'}
          </Button>

          <Alert severity="info" icon={<InfoIcon />}>
            The Dynamic QR Page shows a QR code that automatically updates with a new valid code from this project each time it's scanned.
          </Alert>
        </Stack>
      </Card>

      {/* Info */}
      <Alert severity="info">
        <AlertTitle>About Mint Links</AlertTitle>
        Mint links are loaded from the POAP API and assigned to eligible users when they tweet with a valid code.
        <br /><br />
        <strong>Mint Link States:</strong>
        <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
          <li><strong>Available:</strong> Ready to be assigned to users</li>
          <li><strong>Reserved:</strong> Assigned to a user but not yet claimed</li>
          <li><strong>Claimed:</strong> User has claimed the POAP</li>
        </ul>
        <strong>Note:</strong> Make sure you have configured the correct POAP Event ID and Edit Code in the General settings tab before loading mint links.
      </Alert>
    </Box>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProject();
  }, [resolvedParams.id]);

  useEffect(() => {
    if (project) {
      loadQRCode();

      // Set up polling to detect when QR is scanned
      pollingIntervalRef.current = setInterval(() => {
        checkForNewCode();
      }, 3000); // Check every 3 seconds
    }

    // Cleanup on unmount or when project changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [project]);

  const checkForNewCode = async () => {
    if (!project || !currentCode) {
      // Don't poll until we have an initial code
      return;
    }

    try {
      // Fetch the current available code without generating a new QR
      const response = await fetch(`/api/qr/current-code?projectId=${project.id}`);
      const data = await response.json();

      if (response.ok && data.code && data.code !== currentCode) {
        console.log('New code detected. Old:', currentCode, 'New:', data.code);
        loadQRCode();
      }
    } catch (error) {
      // Silently fail - this is just a backup mechanism
      console.debug('Polling check error:', error);
    }
  };

  const loadQRCode = async () => {
    if (!project) return;

    setLoadingQR(true);
    try {
      const response = await fetch(`/api/qr/generate?projectId=${project.id}`);
      const data = await response.json();

      if (response.ok && data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
        setCurrentCode(data.code);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleCopyUrl = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${baseUrl}/qr/${project?.id}`;

    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const fetchProject = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/projects/${resolvedParams.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch project');
      }

      setProject(data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  if (error || !project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchProject}>
              Retry
            </Button>
          }
        >
          {error || 'Project not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin')}
          sx={{ mt: 2 }}
        >
          Back to Projects
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink
          component={Link}
          href="/admin"
          underline="hover"
          color="inherit"
        >
          Projects
        </MuiLink>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {project.name}
            </Typography>
            <Chip
              label={project.isActive ? 'Active' : 'Inactive'}
              color={project.isActive ? 'success' : 'default'}
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Event ID: {project.poapEventId}
          </Typography>
        </Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin')}
          variant="outlined"
        >
          Back to Projects
        </Button>
      </Box>

      {/* QR Code Section */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Dynamic QR Code
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* QR Code Display */}
          <Box sx={{
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            {loadingQR ? (
              <Box sx={{
                width: 200,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider'
              }}>
                <CircularProgress />
              </Box>
            ) : qrDataUrl ? (
              <Box sx={{
                width: 200,
                height: 200,
                bgcolor: 'white',
                p: 1,
                borderRadius: 1,
                boxShadow: 2
              }}>
                <Image
                  src={qrDataUrl}
                  alt="Project QR Code"
                  width={184}
                  height={184}
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            ) : (
              <Box sx={{
                width: 200,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider'
              }}>
                <Typography variant="body2" color="text.secondary">
                  No QR available
                </Typography>
              </Box>
            )}
          </Box>

          {/* QR Info and Actions */}
          <Box sx={{ flex: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                This QR code links to a dynamic page that shows a unique Twitter share link with a valid code from this project.
                Each scan uses a different code.
              </Typography>
            </Alert>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  QR Page URL
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${project.id}`}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={copySuccess ? <CheckCircleIcon /> : <ContentCopyIcon />}
                    onClick={handleCopyUrl}
                    color={copySuccess ? 'success' : 'primary'}
                    sx={{ minWidth: 100 }}
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(`/qr/${project.id}`, '_blank')}
                  >
                    Open
                  </Button>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="project configuration tabs">
            <Tab icon={<SettingsIcon />} iconPosition="start" label="General" />
            <Tab icon={<MessageIcon />} iconPosition="start" label="POAP Config" />
            <Tab icon={<CodeIcon />} iconPosition="start" label="Valid Codes" />
            <Tab icon={<LinkIcon />} iconPosition="start" label="Mint Links" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* General Tab */}
          <TabPanel value={tabValue} index={0}>
            <GeneralTab project={project} onUpdate={fetchProject} />
          </TabPanel>

          {/* POAP Config Tab */}
          <TabPanel value={tabValue} index={1}>
            <POAPConfigTab project={project} onUpdate={fetchProject} />
          </TabPanel>

          {/* Valid Codes Tab */}
          <TabPanel value={tabValue} index={2}>
            <ValidCodesTab project={project} />
          </TabPanel>

          {/* Mint Links Tab */}
          <TabPanel value={tabValue} index={3}>
            <MintLinksTab project={project} onUpdate={fetchProject} />
          </TabPanel>
        </Box>
      </Card>
    </Container>
  );
}
