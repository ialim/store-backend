import { gql, useMutation } from '@apollo/client';
import { Alert, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography, Button } from '@mui/material';
import { UserSelect, StoreSelect } from '../shared/IdSelects';
import React from 'react';

const CREATE_STAFF = gql`
  mutation CreateStaff($input: CreateStaffInput!) { createStaff(input: $input) { id email } }
`;
const ASSIGN_MANAGER = gql`
  mutation AssignManager($input: AssignStoreManagerInput!) { assignStoreManager(input: $input) { id name managerId } }
`;
const ASSIGN_BILLER = gql`
  mutation AssignBiller($input: AssignBillerInput!) { assignBiller(input: $input) { userId billerId } }
`;

export default function Staff() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'ADMIN'|'BILLER'|'MANAGER'>('MANAGER');
  const [createStaff, { loading: creating, error: createErr }] = useMutation(CREATE_STAFF);

  const [userId, setUserId] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [assignManager, { loading: assigningMgr, error: assignMgrErr }] = useMutation(ASSIGN_MANAGER);

  const [billerId, setBillerId] = React.useState('');
  const [resellerId, setResellerId] = React.useState('');
  const [assignBiller, { loading: assigningBiller, error: assignBillerErr }] = useMutation(ASSIGN_BILLER);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createStaff({ variables: { input: { email, password, role } } });
    setEmail(''); setPassword('');
  };
  const submitManager = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignManager({ variables: { input: { userId, storeId } } });
  };
  const submitBiller = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignBiller({ variables: { input: { billerId, resellerId } } });
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Staff</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitCreate}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Staff</Typography>
              {createErr && <Alert severity="error">{createErr.message}</Alert>}
              <Stack spacing={1}>
                <TextField label="Email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField label="Password" type="password" size="small" value={password} onChange={(e) => setPassword(e.target.value)} />
                <TextField label="Role" size="small" select value={role} onChange={(e) => setRole(e.target.value as any)}>
                  {['ADMIN','BILLER','MANAGER'].map((r) => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
                </TextField>
                <Button type="submit" variant="contained" disabled={creating || !email || !password}>Create</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitManager}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign Store Manager</Typography>
              {assignMgrErr && <Alert severity="error">{assignMgrErr.message}</Alert>}
              <Stack spacing={1}>
                <UserSelect value={userId} onChange={setUserId} />
                <StoreSelect value={storeId} onChange={setStoreId} />
                <Button type="submit" variant="contained" disabled={assigningMgr || !userId || !storeId}>Assign</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitBiller}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign Biller to Reseller</Typography>
              {assignBillerErr && <Alert severity="error">{assignBillerErr.message}</Alert>}
              <Stack spacing={1}>
                <TextField label="Biller User ID" size="small" value={billerId} onChange={(e) => setBillerId(e.target.value)} />
                <TextField label="Reseller User ID" size="small" value={resellerId} onChange={(e) => setResellerId(e.target.value)} />
                <Button type="submit" variant="contained" disabled={assigningBiller || !billerId || !resellerId}>Assign</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
