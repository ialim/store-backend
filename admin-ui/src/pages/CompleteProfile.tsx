import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import { notify } from '../shared/notify';
import { useNavigate } from 'react-router-dom';

const COMPLETE = gql`
  mutation CompleteCustomerProfile($input: UpdateCustomerProfileInput!) {
    completeCustomerProfile(input: $input) {
      userId
      profileStatus
    }
  }
`;

export default function CompleteProfile() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [mutate, { loading }] = useMutation(COMPLETE);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!fullName) {
      setErr('Full name is required');
      return;
    }
    try {
      const input: any = { fullName };
      if (phone) input.phone = phone;
      if (email) input.email = email;
      if (gender) input.gender = gender;
      if (birthday) input.birthday = new Date(birthday).toISOString();
      await mutate({ variables: { input } });
      notify('Profile completed. Welcome!', 'success');
      navigate('/profile');
    } catch (e: any) {
      setErr(e?.message || 'Failed to complete profile');
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Complete Your Profile</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card component="form" onSubmit={submit}>
            <CardContent>
              <Stack spacing={2}>
                {err && <Alert severity="error">{err}</Alert>}
                <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
                <TextField label="Birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} InputLabelProps={{ shrink: true }} />
                <Box>
                  <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

