import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { client } from './shared/apolloClient';
import { AuthProvider } from './shared/AuthProvider';
import { NotificationProvider } from './shared/NotificationProvider';
import NetworkIndicator from './shared/NetworkIndicator';
import { colors, radii, shadows } from '@store/design-tokens';

const baseTheme = createTheme();

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.brand.primary,
      dark: colors.brand.primaryDark,
      light: colors.brand.primaryLight,
      contrastText: colors.neutral.white,
    },
    secondary: {
      main: colors.brand.accent,
      contrastText: colors.neutral.white,
    },
    success: {
      main: colors.brand.primary,
      dark: colors.brand.primaryDark,
      light: colors.feedback.successBg,
      contrastText: colors.neutral.white,
    },
    background: {
      default: colors.neutral.canvas,
      paper: colors.neutral.white,
    },
    text: {
      primary: colors.neutral.textPrimary,
      secondary: colors.neutral.textSecondary,
    },
  },
  shape: {
    borderRadius: radii.md,
  },
  shadows: baseTheme.shadows.map((shadow, index) => {
    if (index === 1) return shadows.level1;
    if (index === 2) return shadows.level2;
    return shadow;
  }) as typeof baseTheme.shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.neutral.canvas,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.pill,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          boxShadow: shadows.card,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(15, 91, 58, 0.08)',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ApolloProvider client={client}>
        <AuthProvider>
          <NotificationProvider>
            <NetworkIndicator />
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
