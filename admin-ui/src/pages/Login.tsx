import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(loginInput: $input) {
      accessToken
      user { id email roleId }
    }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { loading }] = useMutation(LOGIN);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await login({ variables: { input: { email, password } } });
      const token = data?.login?.accessToken as string | undefined;
      if (!token) throw new Error('No token returned');
      setToken(token);
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
          <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

