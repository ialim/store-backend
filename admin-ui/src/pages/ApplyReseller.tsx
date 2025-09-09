import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { notify } from '../shared/notify';

const APPLY = gql`
  mutation ApplyReseller($input: ApplyResellerInput!) {
    applyReseller(input: $input) {
      userId
      profileStatus
      tier
    }
  }
`;

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export default function ApplyReseller() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedBillerId, setRequestedBillerId] = useState('');
  const [tier, setTier] = useState('BRONZE');
  const [creditLimit, setCreditLimit] = useState<number>(100000);
  const [error, setError] = useState<string | null>(null);
  const [apply, { loading }] = useMutation(APPLY);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    try {
      await apply({ variables: { input: { email, password, requestedBillerId: requestedBillerId || null, tier, creditLimit } } });
      notify('Application submitted. Await approval.', 'success');
      navigate('/login');
    } catch (err: any) {
      setError(err?.message || 'Application failed');
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p: 3, width: 480 }} component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h6">Apply as Reseller</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <TextField label="Requested Biller ID (optional)" value={requestedBillerId} onChange={(e) => setRequestedBillerId(e.target.value)} helperText="Optionally request a specific biller by user ID" fullWidth />
          <TextField label="Tier" select value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIERS.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField label="Credit Limit" type="number" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value) || 0)} />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Application'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
