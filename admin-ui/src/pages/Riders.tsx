import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

export default function Riders() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Riders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage field riders, their availability, and assignment readiness. (Coming soon)
        </Typography>
      </Box>
      <Button variant="outlined" disabled sx={{ alignSelf: 'flex-start' }}>
        Add Rider (pending implementation)
      </Button>
    </Stack>
  );
}
