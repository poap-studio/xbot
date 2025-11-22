/**
 * MUI Theme Provider
 * Wraps the app with Material-UI theme
 */

'use client';

import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
