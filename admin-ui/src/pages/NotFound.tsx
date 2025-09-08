import { Box, Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import { getDefaultRoute } from '../shared/routes';

export default function NotFound() {
  const { token, user } = useAuth();
  const home = token ? getDefaultRoute(user?.roleName) : '/login';
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="40vh">
      <Stack spacing={2} alignItems="center">
        <Typography variant="h4">Page not found</Typography>
        <Typography color="text.secondary">The page you are looking for does not exist.</Typography>
        <Button variant="contained" component={Link} to={home}>Go to Home</Button>
      </Stack>
    </Box>
  );
}

