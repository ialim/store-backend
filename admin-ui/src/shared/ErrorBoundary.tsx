import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught', error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">
            <Stack spacing={1}>
              <Typography variant="subtitle2">Something went wrong.</Typography>
              <Typography variant="caption" color="text.secondary">
                Try reloading the page or navigating back.
              </Typography>
              <Box>
                <Button size="small" variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
                <Button size="small" sx={{ ml: 1 }} onClick={this.reset}>Dismiss</Button>
              </Box>
            </Stack>
          </Alert>
        </Box>
      );
    }
    return this.props.children as any;
  }
}

