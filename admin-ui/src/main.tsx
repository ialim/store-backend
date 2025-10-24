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

const baseTheme = createTheme();
const brandGreen = '#0f5b3a';
const brandGreenDark = '#0b3f29';
const brandAccent = '#ff8a3d';
const canvas = '#f3f6f9';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandGreen,
      dark: brandGreenDark,
      light: '#2c7b54',
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandAccent,
      contrastText: '#ffffff',
    },
    success: {
      main: brandGreen,
      dark: brandGreenDark,
      light: '#d9f0e4',
      contrastText: '#ffffff',
    },
    background: {
      default: canvas,
      paper: '#ffffff',
    },
    text: {
      primary: '#1c262b',
      secondary: '#5f6b6b',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: baseTheme.shadows.map((shadow, index) => {
    if (index === 1) return '0 12px 24px rgba(15, 91, 58, 0.08)';
    if (index === 2) return '0 18px 36px rgba(15, 91, 58, 0.12)';
    return shadow;
  }) as typeof baseTheme.shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: canvas,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(15, 91, 58, 0.08)',
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
