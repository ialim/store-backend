import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import { notify } from '../shared/notify';
import { decodeJwt } from '../shared/jwt';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { loading }] = useMutation(LOGIN);
  const { setAuth, token } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to default page
  useEffect(() => {
    if (token) navigate('/outbox', { replace: true });
  }, [token, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await login({
        variables: { input: { email, password } },
      });
      const token = data?.login?.accessToken as string | undefined;
      if (!token) throw new Error('No token returned');
      const claims = decodeJwt(token);
      const user = {
        id: (claims?.sub as string) || '',
        email: (claims?.email as string) || email,
        roleId: (claims?.roleId as string) || '',
        roleName: (claims?.roleName as string) || undefined,
      };
      setAuth({ token, user });
      notify(`Welcome ${user.email}`, 'success');
      navigate('/outbox');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p: 3, width: 360 }} component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h6">Admin Login</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>
          <Typography variant="body2">
            New customer?{' '}
            <Link component={RouterLink} to="/signup">Create an account</Link>
          </Typography>
          <Typography variant="body2">
            Are you a reseller?{' '}
            <Link component={RouterLink} to="/apply-reseller">Apply here</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
