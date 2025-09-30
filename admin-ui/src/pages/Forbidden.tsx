import { Alert, Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="h5">Access Denied</Typography>
      <Alert severity="warning">You do not have permission to view this page.</Alert>
      <Button component={Link} to="/" variant="outlined" size="small">Go Home</Button>
    </Stack>
  );
}
