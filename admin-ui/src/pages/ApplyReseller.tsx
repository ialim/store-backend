import { useState } from 'react';
import { useApplyResellerMutation } from '../generated/graphql';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { notify } from '../shared/notify';


export default function ApplyReseller() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apply, { loading }] = useApplyResellerMutation();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || !companyName || !contactPersonName || !contactPhone) {
      setError('All fields are required');
      return;
    }
    try {
      await apply({
        variables: {
          input: {
            email: email.trim(),
            password,
            companyName: companyName.trim(),
            contactPersonName: contactPersonName.trim(),
            contactPhone: contactPhone.trim(),
          },
        },
      });
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
          <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} fullWidth required />
          <TextField label="Contact Person Name" value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} fullWidth required />
          <TextField label="Contact Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} fullWidth required />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Application'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
