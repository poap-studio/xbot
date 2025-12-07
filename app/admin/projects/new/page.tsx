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
  Button,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body, backend will generate defaults
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Redirect to project detail page for configuration
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Create New Project
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Create Project Card */}
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Create a New POAP Project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Click the button below to create a new project. You'll be redirected to configure all settings.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            onClick={() => router.push('/admin')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleCreateProject}
            disabled={loading}
            size="large"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </Box>
      </Card>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
          After creating the project, you'll configure:
        </Typography>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>POAP Event ID and Edit Code</li>
          <li>Twitter hashtag to monitor</li>
          <li>Reply templates and bot settings</li>
          <li>Valid codes for users to tweet</li>
          <li>QR codes from POAP API</li>
        </ul>
      </Alert>
    </Container>
  );
}
