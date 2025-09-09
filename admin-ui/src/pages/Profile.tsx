import React from 'react';
import { Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../shared/AuthProvider';
import { decodeJwt } from '../shared/jwt';
import { notify } from '../shared/notify';
import { gql, useMutation, useQuery } from '@apollo/client';

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`;

const ME = gql`
  query Me {
    me {
      id
      email
      role {
        name
        permissions { id name module action }
      }
    }
  }
`;

function formatDate(ts?: number) {
  if (!ts) return '-';
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  } catch {
    return '-';
  }
}

function maskToken(t?: string | null) {
  if (!t) return '-';
  if (t.length <= 24) return t;
  return `${t.slice(0, 12)}...${t.slice(-8)}`;
}

export default function Profile() {
  const { user, token, logout, hasRole, hasPermission, permissions } = useAuth();
  const claims = token ? decodeJwt(token) : null;
  const exp = (claims?.exp as number | undefined) || undefined;
  const iat = (claims?.iat as number | undefined) || undefined;
  const { data: meData, refetch } = useQuery(ME, { fetchPolicy: 'cache-and-network' });
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [changePassword, { loading: changing }] = useMutation(CHANGE_PASSWORD);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      notify('Access token copied', 'success');
    } catch {
      notify('Failed to copy token', 'error');
    }
  };

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      notify('Please fill all password fields', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('New passwords do not match', 'error');
      return;
    }
    try {
      const res = await changePassword({ variables: { input: { currentPassword, newPassword } } });
      if (res.data?.changePassword) {
        notify('Password changed. Please login again.', 'success');
        logout();
      } else {
        notify('Failed to change password', 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to change password';
      notify(msg, 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Profile</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">User</Typography>
                <Typography><b>Email:</b> {user?.email || '-'}</Typography>
                <Typography><b>Role:</b> {meData?.me?.role?.name || user?.roleName || user?.roleId || '-'}</Typography>
                <Typography><b>User ID:</b> {user?.id || '-'}</Typography>
                <Box>
                  <Button size="small" onClick={() => refetch()}>Refresh</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">Session</Typography>
                <Typography><b>Token:</b> {maskToken(token)}</Typography>
                <Typography><b>Issued:</b> {formatDate(iat)}</Typography>
                <Typography><b>Expires:</b> {formatDate(exp)}</Typography>
                <Box>
                  <Button size="small" variant="outlined" onClick={copy} sx={{ mr: 1 }}>Copy Token</Button>
                  <Button size="small" color="error" variant="contained" onClick={logout}>Logout</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">Permissions Debug</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2"><b>Role Matches</b></Typography>
                      <Typography variant="caption">SUPERADMIN: {String(hasRole('SUPERADMIN'))}</Typography><br />
                      <Typography variant="caption">ADMIN: {String(hasRole('ADMIN'))}</Typography><br />
                      <Typography variant="caption">MANAGER: {String(hasRole('MANAGER'))}</Typography><br />
                      <Typography variant="caption">ACCOUNTANT: {String(hasRole('ACCOUNTANT'))}</Typography><br />
                      <Typography variant="caption">BILLER: {String(hasRole('BILLER'))}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2"><b>Nav Gates</b></Typography>
                      <Typography variant="caption">Outbox: {String(hasRole('SUPERADMIN','ADMIN','MANAGER','ACCOUNTANT') || hasPermission('VIEW_REPORTS'))}</Typography><br />
                      <Typography variant="caption">Low Stock: {String(hasRole('SUPERADMIN','ADMIN','MANAGER') || hasPermission('MANAGE_PRODUCTS','VIEW_REPORTS'))}</Typography><br />
                      <Typography variant="caption">Fulfillment: {String(hasRole('SUPERADMIN','ADMIN','MANAGER','BILLER') || hasPermission('ASSIGN_MANAGER','ASSIGN_BILLER'))}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2"><b>Permissions</b></Typography>
                      <Typography variant="caption" color="text.secondary">{permissions.length ? permissions.join(', ') : 'None'}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

        <Grid item xs={12}>
          <Card component="form" onSubmit={submitChange}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">Change Password</Typography>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="At least 8 characters"
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Box>
                  <Button type="submit" variant="contained" disabled={changing}>Change Password</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">Permissions</Typography>
                {meData?.me?.role?.permissions?.length ? (
                  <Grid container spacing={1}>
                    {meData.me.role.permissions.map((p: any) => (
                      <Grid item xs={12} sm={6} md={4} key={p.id}>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                          <Typography variant="body2"><b>{p.name}</b></Typography>
                          <Typography variant="caption" color="text.secondary">{p.module} • {p.action}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography color="text.secondary">No permissions found.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
