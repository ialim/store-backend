import { useEffect, useState } from 'react';
import { Alert, Box, Stack, Typography, Link as MuiLink } from '@mui/material';
import { useLoginMutation } from '../generated/graphql';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import { notify } from '../shared/notify';
import { decodeJwt } from '../shared/jwt';
import { Link as RouterLink } from 'react-router-dom';
import { getDefaultRoute } from '../shared/routes';
import { Screen, NavBar, Card, TextField, Button, ListItem, Tag } from '@store/ui-web';
import { spacing, radii } from '@store/design-tokens';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [login, { loading }] = useLoginMutation();
  const { setAuth, token, user } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to default page
  useEffect(() => {
    if (token) {
      const destination = getDefaultRoute(user?.roleName);
      navigate(destination, { replace: true });
    }
  }, [token, user?.roleName, navigate]);

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email is required';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) return 'Enter a valid email address';
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setEmail(next);
    if (error) setError(null);
    if (emailError) {
      setEmailError(validateEmail(next));
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setPassword(next);
    if (error) setError(null);
    if (passwordError) {
      setPasswordError(validatePassword(next));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setError('Please fix the highlighted fields.');
      return;
    }

    try {
      const { data } = await login({
        variables: { input: { email: email.trim(), password } },
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
      const destination = getDefaultRoute(user.roleName);
      navigate(destination, { replace: true });
    } catch (err: any) {
      const message =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Login failed. Check your email and password.';
      setError(message);
    }
  };

  const buttonDisabled = loading || Boolean(emailError) || Boolean(passwordError);

  return (
    <Screen padded sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: `${spacing['2xl']}px` }}>
      <NavBar title="Sign in" subtitle={stakeholderCopy(user?.roleName)} showDivider sx={{ width: '100%', maxWidth: 480, mb: `${spacing.lg}px` }} />
      <Card
        sx={{
          width: 400,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: `${spacing.lg}px`,
        }}
      >
        <Box component="form" onSubmit={submit} noValidate>
          <Stack spacing={`${spacing.lg}px`}>
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>Welcome back</Typography>
              <Typography variant="body2" color="text.secondary">Sign in with your administrator credentials.</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setEmailError(validateEmail(email))}
              error={Boolean(emailError)}
              helperText={emailError || ' '}
              fullWidth
              type="email"
              autoComplete="email"
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => setPasswordError(validatePassword(password))}
              error={Boolean(passwordError)}
              helperText={passwordError || ' '}
              fullWidth
              autoComplete="current-password"
              required
            />
            <Button
              type="submit"
              label={loading ? 'Logging in…' : 'Login'}
              loading={loading}
              disabled={buttonDisabled}
              fullWidth
            />
            <Typography variant="body2">
              New customer?{' '}
              <MuiLink component={RouterLink} to="/signup">
                Create an account
              </MuiLink>
            </Typography>
            <Typography variant="body2">
              Are you a reseller?{' '}
              <MuiLink component={RouterLink} to="/apply-reseller">
                Apply here
              </MuiLink>
            </Typography>
          </Stack>
        </Box>
      </Card>
      <Card
        sx={{
          width: 400,
          maxWidth: '100%',
          mt: `${spacing.lg}px`,
          paddingBlock: `${spacing.lg}px`,
        }}
      >
        <ListItem
          title="Need help accessing your account?"
          description="Contact support and mention your registered email so we can verify quickly."
          trailing={<Tag label="Support" variant="info" tone="subtle" uppercase />}
          sx={{ borderRadius: `${radii.md}px` }}
        />
      </Card>
    </Screen>
  );
}

function stakeholderCopy(roleName?: string) {
  if (!roleName) return undefined;
  return `Signed in as ${roleName}`;
}
