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

const theme = createTheme();

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
