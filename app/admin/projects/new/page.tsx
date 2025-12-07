/**
 * New Project Page
 * Create a new POAP project
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  TextField,
  Button,
  Alert,
  Stack,
  FormControlLabel,
  Switch,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    poapEventId: '',
    poapEditCode: '',
    twitterHashtag: '#POAP',
    allowMultipleClaims: false,
    isActive: true,
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Redirect to project detail page
      router.push(`/admin/projects/${data.project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
        <Typography color="text.primary">New Project</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Create New Project
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin')}
          variant="outlined"
        >
          Cancel
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Card>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* POAP Event ID */}
            <TextField
              label="POAP Event ID"
              placeholder="123456"
              value={formData.poapEventId}
              onChange={handleChange('poapEventId')}
              required
              fullWidth
              helperText="The POAP event ID from poap.xyz"
            />

            {/* POAP Edit Code */}
            <TextField
              label="POAP Edit Code"
              placeholder="abc123xyz"
              value={formData.poapEditCode}
              onChange={handleChange('poapEditCode')}
              required
              fullWidth
              type="password"
              helperText="The edit code to load QR codes from POAP API"
            />

            {/* Twitter Hashtag */}
            <TextField
              label="Twitter Hashtag"
              placeholder="#POAP"
              value={formData.twitterHashtag}
              onChange={handleChange('twitterHashtag')}
              required
              fullWidth
              helperText="The hashtag to monitor on Twitter (include #)"
            />

            {/* Settings */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Settings
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allowMultipleClaims}
                      onChange={handleChange('allowMultipleClaims')}
                    />
                  }
                  label="Allow Multiple Claims"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Allow users to claim multiple POAPs from this drop
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleChange('isActive')}
                    />
                  }
                  label="Active"
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                  Activate this project immediately after creation
                </Typography>
              </Stack>
            </Box>

            {/* Submit Button */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
              <Button
                onClick={() => router.push('/admin')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Card>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
          After creating the project, you'll be able to:
        </Typography>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Configure reply templates and bot settings</li>
          <li>Upload valid codes for users to tweet</li>
          <li>Load QR codes from POAP API</li>
          <li>Monitor deliveries and track claims</li>
        </ul>
      </Alert>
    </Container>
  );
}
