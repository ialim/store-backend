import { useEffect, useState } from 'react';
import { useSignupCustomerMutation } from '../generated/graphql';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../shared/AuthProvider';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { decodeJwt } from '../shared/jwt';
import { notify } from '../shared/notify';


export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signup, { loading }] = useSignupCustomerMutation();
  const { token, setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/profile', { replace: true });
  }, [token, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide email and password');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      const { data } = await signup({ variables: { input: { email, password } } });
      const token = data?.signupCustomer?.accessToken as string | undefined;
      if (!token) throw new Error('No token returned');
      const claims = decodeJwt(token);
      const user = {
        id: (claims?.sub as string) || '',
        email: (claims?.email as string) || email,
        roleId: (claims?.roleId as string) || '',
        roleName: (claims?.roleName as string) || undefined,
      };
      setAuth({ token, user });
      notify('Signup successful. Please complete your profile.', 'success');
      navigate('/complete-profile');
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p: 3, width: 420 }} component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h6">Create Customer Account</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <TextField label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} fullWidth />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Signing up…' : 'Sign Up'}
          </Button>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Login</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
