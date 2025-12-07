/**
 * Project Detail Page
 * Manage individual project configuration with tabs
 */

'use client';

import { useEffect, useState, use } from 'react';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  QrCode as QrCodeIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import Link from 'next/link';

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

  useEffect(() => {
    fetchProject();
  }, [resolvedParams.id]);

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

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="project configuration tabs">
            <Tab icon={<SettingsIcon />} iconPosition="start" label="General" />
            <Tab icon={<MessageIcon />} iconPosition="start" label="POAP Config" />
            <Tab icon={<CodeIcon />} iconPosition="start" label="Valid Codes" />
            <Tab icon={<QrCodeIcon />} iconPosition="start" label="QR Codes" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* General Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Project configuration coming soon...
            </Typography>
          </TabPanel>

          {/* POAP Config Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              POAP Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reply templates and settings coming soon...
            </Typography>
          </TabPanel>

          {/* Valid Codes Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Valid Codes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Code management coming soon...
            </Typography>
          </TabPanel>

          {/* QR Codes Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              QR Codes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              QR code management coming soon...
            </Typography>
          </TabPanel>
        </Box>
      </Card>
    </Container>
  );
}
