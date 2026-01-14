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
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon,
  Message as MessageIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
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
  requireUniqueCode: boolean;
  requireImage: boolean;
  botReplyEligible: string;
  botReplyNotEligible: string;
  botReplyAlreadyClaimed: string;
  botReplyNoPoapsAvailable: string;
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
function GeneralTab({
  project,
  onUpdate,
  qrDataUrl,
  loadingQR,
  copySuccess,
  handleCopyUrl,
}: {
  project: Project;
  onUpdate: (updatedProject: Partial<Project>) => void;
  qrDataUrl: string | null;
  loadingQR: boolean;
  copySuccess: boolean;
  handleCopyUrl: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    isActive: project.isActive,
    requireUniqueCode: project.requireUniqueCode,
    requireImage: project.requireImage,
  });

  // Sync formData with project when it changes
  useEffect(() => {
    setFormData({
      isActive: project.isActive,
      requireUniqueCode: project.requireUniqueCode,
      requireImage: project.requireImage,
    });
  }, [project.isActive, project.requireUniqueCode, project.requireImage]);

  return (
    <Box>
      {/* Dynamic QR Code Section */}
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

      {/* General Settings */}
      <Box>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setFormData({ ...formData, isActive: newValue });

                    // Auto-save on change
                    setSaving(true);
                    setError(null);

                    try {
                      const response = await fetch(`/api/admin/projects/${project.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ isActive: newValue }),
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || 'Failed to update project');
                      }

                      onUpdate(data.project);
                    } catch (error) {
                      console.error('Error updating project:', error);
                      setError(error instanceof Error ? error.message : 'Failed to update project');
                      // Revert the change on error
                      setFormData({ ...formData, isActive: !newValue });
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              }
              label="Active"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              When inactive, the bot will not process tweets or deliver POAPs for this project.
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requireUniqueCode}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setFormData({ ...formData, requireUniqueCode: newValue });

                    // Auto-save on change
                    setSaving(true);
                    setError(null);

                    try {
                      const response = await fetch(`/api/admin/projects/${project.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ requireUniqueCode: newValue }),
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || 'Failed to update project');
                      }

                      onUpdate(data.project);
                    } catch (error) {
                      console.error('Error updating project:', error);
                      setError(error instanceof Error ? error.message : 'Failed to update project');
                      // Revert the change on error
                      setFormData({ ...formData, requireUniqueCode: !newValue });
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              }
              label="Require Secret Code"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              When disabled, POAPs will be delivered to any tweet with the bot mention and hashtag (no code validation).
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requireImage}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setFormData({ ...formData, requireImage: newValue });

                    // Auto-save on change
                    setSaving(true);
                    setError(null);

                    try {
                      const response = await fetch(`/api/admin/projects/${project.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ requireImage: newValue }),
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        throw new Error(data.error || 'Failed to update project');
                      }

                      onUpdate(data.project);
                    } catch (error) {
                      console.error('Error updating project:', error);
                      setError(error instanceof Error ? error.message : 'Failed to update project');
                      // Revert the change on error
                      setFormData({ ...formData, requireImage: !newValue });
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              }
              label="Require Image"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              When disabled, POAPs will be delivered even if the tweet doesn't contain an image.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// Bot Config Tab Component
function BotConfigTab({ project, onUpdate }: { project: Project; onUpdate: (updatedProject: Partial<Project>) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingBots, setLoadingBots] = useState(true);
  const [botAccounts, setBotAccounts] = useState<Array<{
    id: string;
    username: string;
    displayName: string | null;
    profileImageUrl: string | null;
    isConnected: boolean;
    _count: { projects: number };
  }>>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>(project.botAccountId || '');
  const [formData, setFormData] = useState({
    twitterHashtag: project.twitterHashtag,
    botReplyEligible: project.botReplyEligible,
    botReplyNotEligible: project.botReplyNotEligible,
    botReplyAlreadyClaimed: project.botReplyAlreadyClaimed,
    botReplyNoPoapsAvailable: project.botReplyNoPoapsAvailable,
    qrPageTweetTemplate: project.qrPageTweetTemplate,
  });

  // Sync selectedBotId with project when it changes
  useEffect(() => {
    setSelectedBotId(project.botAccountId || '');
  }, [project.botAccountId]);

  // Sync formData with project when it changes
  useEffect(() => {
    setFormData({
      twitterHashtag: project.twitterHashtag,
      botReplyEligible: project.botReplyEligible,
      botReplyNotEligible: project.botReplyNotEligible,
      botReplyAlreadyClaimed: project.botReplyAlreadyClaimed,
      botReplyNoPoapsAvailable: project.botReplyNoPoapsAvailable,
      qrPageTweetTemplate: project.qrPageTweetTemplate,
    });
  }, [project.twitterHashtag, project.botReplyEligible, project.botReplyNotEligible, project.botReplyAlreadyClaimed, project.botReplyNoPoapsAvailable, project.qrPageTweetTemplate]);

  // Load bot accounts on mount
  useEffect(() => {
    fetchBotAccounts();
  }, []);

  const fetchBotAccounts = async () => {
    setLoadingBots(true);
    try {
      const response = await fetch('/api/admin/bot-accounts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bot accounts');
      }

      setBotAccounts(data.botAccounts || []);
    } catch (error) {
      console.error('Error fetching bot accounts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load bot accounts');
    } finally {
      setLoadingBots(false);
    }
  };

  const handleBotChange = async (newBotId: string) => {
    setSelectedBotId(newBotId);

    // Auto-save bot selection
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botAccountId: newBotId || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update bot account');
      }

      onUpdate(data.project);
    } catch (error) {
      console.error('Error updating bot account:', error);
      setError(error instanceof Error ? error.message : 'Failed to update bot account');
      // Revert the change on error
      setSelectedBotId(project.botAccountId || '');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectNewBot = () => {
    // Open OAuth flow in new window
    const popup = window.open('/api/auth/bot-twitter', 'Connect Bot', 'width=600,height=700');

    // Poll to detect when popup closes and reload bot list
    const pollTimer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(pollTimer);
        // Reload bot accounts list after connection
        fetchBotAccounts();
      }
    }, 500);
  };

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
        throw new Error(data.error || 'Failed to update bot config');
      }

      onUpdate(data.project);
    } catch (error) {
      console.error('Error updating bot config:', error);
      setError(error instanceof Error ? error.message : 'Failed to update bot config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Bot Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure bot behavior, hashtags, reply messages and claim settings
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Bot Account Selection Section */}
        <Card sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Bot Account
          </Typography>

          {loadingBots ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  select
                  label="Select Bot Account"
                  value={selectedBotId}
                  onChange={(e) => handleBotChange(e.target.value)}
                  disabled={saving}
                  fullWidth
                  helperText="Choose which Twitter account will reply to tweets for this project"
                  SelectProps={{
                    displayEmpty: true,
                  }}
                >
                  <MenuItem value="">
                    <em>No bot selected (use any available)</em>
                  </MenuItem>
                  {botAccounts.map((bot) => (
                    <MenuItem key={bot.id} value={bot.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Avatar
                          src={bot.profileImageUrl || undefined}
                          alt={bot.username}
                          sx={{ width: 32, height: 32 }}
                        >
                          {bot.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            @{bot.username}
                          </Typography>
                          {bot.displayName && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {bot.displayName}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          {!bot.isConnected && (
                            <Chip label="Disconnected" size="small" color="error" />
                          )}
                          {bot._count.projects > 0 && (
                            <Chip
                              label={`${bot._count.projects}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={handleConnectNewBot}
                  sx={{ minWidth: 180, height: 56 }}
                >
                  Connect Bot
                </Button>
              </Box>

              {selectedBotId && (
                <Alert severity="info" icon={<InfoIcon />}>
                  Bot @{botAccounts.find(b => b.id === selectedBotId)?.username} will be used to reply to tweets for this project.
                </Alert>
              )}

              {!selectedBotId && (
                <Alert severity="warning" icon={<InfoIcon />}>
                  No specific bot selected. The system will use any available connected bot account to reply.
                </Alert>
              )}
            </Stack>
          )}
        </Card>

        {/* Twitter Settings Section */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Twitter Settings
          </Typography>

          <TextField
            label="Twitter Hashtag"
            value={formData.twitterHashtag}
            onChange={handleChange('twitterHashtag')}
            required
            fullWidth
            helperText="Hashtag that users must include in their tweets (e.g., #POAP, #MyEvent)"
          />
        </Box>

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

            <TextField
              label="No POAPs Available Reply Message"
              value={formData.botReplyNoPoapsAvailable}
              onChange={handleChange('botReplyNoPoapsAvailable')}
              required
              fullWidth
              multiline
              rows={3}
              helperText="Reply sent when there are no POAPs available, event is misconfigured, or event ID/secret are incorrect. Use {username} as placeholder."
            />
          </Stack>
        </Box>

        {/* Tweet Template */}
        <Box>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Tweet Template
          </Typography>

          <TextField
            label="Tweet Template for QR Page"
            value={formData.qrPageTweetTemplate}
            onChange={handleChange('qrPageTweetTemplate')}
            required
            fullWidth
            multiline
            rows={3}
            helperText="Template for the tweet shown on the QR claim page. Use {{code}}, {{bot}}, and {{hashtag}} as placeholders."
          />
        </Box>

        {/* Template Preview */}
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Template Placeholders:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            <strong>For QR Page Tweet Template:</strong>
          </Typography>
          <ul style={{ margin: '4px 0 12px 0', paddingLeft: '20px' }}>
            <li><code>{'{{'}</code><code>code</code><code>{'}}'}</code> - Hidden code from the pool (e.g., "ABC123")</li>
            <li><code>{'{{'}</code><code>bot</code><code>{'}}'}</code> - Bot account mention (e.g., "@poapstudio")</li>
            <li><code>{'{{'}</code><code>hashtag</code><code>{'}}'}</code> - Project hashtag (e.g., "#POAP")</li>
          </ul>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            <strong>For Bot Reply Templates:</strong>
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

// Mint Links Tab Component
function MintLinksTab({ project, onUpdate }: { project: Project; onUpdate: (updatedProject: Partial<Project>) => void }) {
  const [loading, setLoading] = useState(true);
  const [loadingQRs, setLoadingQRs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, available: 0, reserved: 0, claimed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    poapEventId: project.poapEventId,
    poapEditCode: project.poapEditCode,
    allowMultipleClaims: project.allowMultipleClaims,
  });

  // Sync formData with project when it changes
  useEffect(() => {
    setFormData({
      poapEventId: project.poapEventId,
      poapEditCode: project.poapEditCode,
      allowMultipleClaims: project.allowMultipleClaims,
    });
  }, [project.poapEventId, project.poapEditCode, project.allowMultipleClaims]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Check if eventId or editCode changed
    const eventIdChanged = formData.poapEventId !== project.poapEventId;
    const editCodeChanged = formData.poapEditCode !== project.poapEditCode;
    const shouldRefreshMintLinks = eventIdChanged || editCodeChanged;

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
          onUpdate({ ...data.project, name: nameData.name });
        } else {
          onUpdate(data.project);
        }
      } catch (nameError) {
        console.warn('Failed to fetch POAP event name:', nameError);
        onUpdate(data.project);
      }

      // If eventId or editCode changed, auto-refresh mint links
      if (shouldRefreshMintLinks) {
        console.log('POAP Event ID or Edit Code changed, auto-refreshing mint links...');
        setSaving(false); // End saving state
        setLoadingQRs(true); // Start loading QRs state

        try {
          const qrResponse = await fetch('/api/admin/qr-codes/load', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId: formData.poapEventId,
              editCode: formData.poapEditCode,
              projectId: project.id,
            }),
          });

          const qrData = await qrResponse.json();

          if (!qrResponse.ok) {
            throw new Error(qrData.error || 'Failed to load mint links');
          }

          await fetchStats();
          console.log('✅ Mint links auto-refreshed successfully');
        } catch (qrError) {
          console.error('Error auto-refreshing mint links:', qrError);
          setError(qrError instanceof Error ? qrError.message : 'Failed to auto-refresh mint links from POAP API');
        } finally {
          setLoadingQRs(false);
        }
      }
    } catch (error) {
      console.error('Error updating POAP settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to update POAP settings');
      setSaving(false);
    } finally {
      if (!shouldRefreshMintLinks) {
        setSaving(false);
      }
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
            color="primary"
            startIcon={loadingQRs ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleLoadFromPOAP}
            disabled={loadingQRs}
            fullWidth
          >
            {loadingQRs ? 'Loading Mint Links from POAP...' : 'Load/Refresh Mint Links from POAP API'}
          </Button>
        </Stack>
      </Card>

      {/* Claim Settings */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Claim Settings
        </Typography>

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.allowMultipleClaims}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  handleChange('allowMultipleClaims')(e);

                  // Auto-save on change
                  try {
                    const response = await fetch(`/api/admin/projects/${project.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ allowMultipleClaims: newValue }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to update claim settings');
                    }

                    onUpdate(data.project);
                  } catch (error) {
                    console.error('Error updating claim settings:', error);
                    setError(error instanceof Error ? error.message : 'Failed to update claim settings');
                    // Revert the change on error
                    setFormData({ ...formData, allowMultipleClaims: !newValue });
                  }
                }}
              />
            }
            label="Allow Multiple Claims"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            If enabled, users can claim multiple POAPs from this drop. If disabled, users can only claim once.
          </Typography>
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

  const updateProject = (updatedFields: Partial<Project>) => {
    if (project) {
      setProject({ ...project, ...updatedFields });
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
            <Tab icon={<MessageIcon />} iconPosition="start" label="Bot Config" />
            <Tab icon={<LinkIcon />} iconPosition="start" label="Mint Links" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* General Tab */}
          <TabPanel value={tabValue} index={0}>
            <GeneralTab
              project={project}
              onUpdate={updateProject}
              qrDataUrl={qrDataUrl}
              loadingQR={loadingQR}
              copySuccess={copySuccess}
              handleCopyUrl={handleCopyUrl}
            />
          </TabPanel>

          {/* Bot Config Tab */}
          <TabPanel value={tabValue} index={1}>
            <BotConfigTab project={project} onUpdate={updateProject} />
          </TabPanel>

          {/* Mint Links Tab */}
          <TabPanel value={tabValue} index={2}>
            <MintLinksTab project={project} onUpdate={updateProject} />
          </TabPanel>
        </Box>
      </Card>
    </Container>
  );
}
