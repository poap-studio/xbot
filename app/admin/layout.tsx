/**
 * Admin Layout
 * Navigation and layout for backoffice pages
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  SmartToy as SmartToyIcon,
  LocalShipping as DeliveryIcon,
  Home as HomeIcon,
  QrCode2 as QrCodeIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const DRAWER_WIDTH = 240;

const navigation = [
  { name: 'Projects', href: '/admin', icon: <DashboardIcon /> },
  { name: 'Drops', href: '/admin/deliveries', icon: <DeliveryIcon /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show navigation on login and unauthorized pages
  const showNavigation = pathname !== '/admin/login' && pathname !== '/admin/unauthorized';

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
      });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top AppBar */}
      {showNavigation && <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
        elevation={0}
      >
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 'bold', color: 'text.primary' }}
          >
            POAP Bot Admin
          </Typography>
          <Button
            component={Link}
            href="/"
            startIcon={<HomeIcon />}
            sx={{
              color: 'text.secondary',
              mr: 1,
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Back to Home
          </Button>
          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>}

      {/* Sidebar Drawer */}
      {showNavigation && <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ overflow: 'auto', p: 2 }}>
          <List>
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname?.startsWith(item.href));

              return (
                <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    selected={isActive}
                    sx={{
                      borderRadius: 1.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? 'primary.contrastText' : 'text.secondary',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 'bold' : 'medium',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {showNavigation && <Toolbar />} {/* Spacer for AppBar */}
        {children}
      </Box>
    </Box>
  );
}
