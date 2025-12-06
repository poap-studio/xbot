/**
 * Admin Dashboard Page
 * Shows list of all projects
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QrCode as QrCodeIcon,
  Twitter as TwitterIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface ProjectStats {
  validCodes: number;
  qrCodes: number;
  deliveries: number;
  claimedDeliveries: number;
  tweets: number;
  eligibleTweets: number;
}

interface Project {
  id: string;
  name: string;
  poapEventId: string;
  twitterHashtag: string;
  isActive: boolean;
  botAccount: {
    username: string;
    isConnected: boolean;
  } | null;
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Se eliminarán todos los datos relacionados.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      // Refresh projects list
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error al eliminar el proyecto: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
          <Button onClick={fetchProjects} size="small" sx={{ mt: 1 }}>
            Reintentar
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Proyectos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestiona tus drops de POAP
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/admin/projects/new')}
            sx={{ height: 'fit-content' }}
          >
            Nuevo Proyecto
          </Button>
        </Box>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
              📦
            </Typography>
            <Typography variant="h6" gutterBottom>
              No hay proyectos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crea tu primer proyecto para empezar a distribuir POAPs
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/admin/projects/new')}
            >
              Crear Proyecto
            </Button>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {projects.map((project) => (
              <Box key={project.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {project.name}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            label={project.isActive ? 'Activo' : 'Inactivo'}
                            color={project.isActive ? 'success' : 'default'}
                            size="small"
                            icon={project.isActive ? <CheckIcon /> : <CloseIcon />}
                          />
                          {project.botAccount && (
                            <Chip
                              label={`@${project.botAccount.username}`}
                              size="small"
                              icon={<TwitterIcon />}
                              color={project.botAccount.isConnected ? 'primary' : 'default'}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>

                    {/* Details */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Event ID:</strong> {project.poapEventId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Hashtag:</strong> {project.twitterHashtag}
                      </Typography>
                    </Stack>

                    {/* Stats */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {project.stats.qrCodes}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          QR Codes
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {project.stats.deliveries}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Entregas
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {project.stats.validCodes}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Códigos
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {project.stats.eligibleTweets}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tweets
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>

                  {/* Actions */}
                  <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => router.push(`/admin/projects/${project.id}`)}
                      fullWidth
                    >
                      Editar
                    </Button>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Stack>
    </Container>
  );
}
