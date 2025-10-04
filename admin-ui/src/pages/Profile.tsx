import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../shared/AuthProvider';
import { decodeJwt } from '../shared/jwt';
import { notify } from '../shared/notify';
import {
  useChangePasswordMutation,
  useMeQuery,
  useUpdateMyProfileMutation,
} from '../generated/graphql';

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

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
    >
      {label}
    </Typography>
    <Typography variant="body1">{value || '—'}</Typography>
  </Grid>
);

export default function Profile() {
  const { user, token, logout } = useAuth();
  const claims = token ? decodeJwt(token) : null;
  const exp = (claims?.exp as number | undefined) || undefined;
  const iat = (claims?.iat as number | undefined) || undefined;
  const { data: meData, refetch } = useMeQuery({ fetchPolicy: 'cache-and-network' as any });
  const [profileName, setProfileName] = React.useState('');
  const [profileEmail, setProfileEmail] = React.useState('');
  const [profilePhone, setProfilePhone] = React.useState('');
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [changePassword, { loading: changing }] = useChangePasswordMutation();
  const [updateProfile, { loading: savingProfile }] = useUpdateMyProfileMutation();

  React.useEffect(() => {
    const profile = meData?.me?.customerProfile;
    setProfileName(profile?.fullName || '');
    setProfileEmail(profile?.email || meData?.me?.email || '');
    setProfilePhone(profile?.phone || '');
    setEditingProfile(false);
  }, [meData?.me?.customerProfile, meData?.me?.email]);

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      notify('Access token copied', 'success');
    } catch {
      notify('Failed to copy token', 'error');
    }
  };

  const submitChangePassword = async (e: React.FormEvent) => {
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
      const res = await changePassword({
        variables: { input: { currentPassword, newPassword } },
      });
      if (res.data?.changePassword) {
        notify('Password changed. Please login again.', 'success');
        logout();
      } else {
        notify('Failed to change password', 'error');
      }
    } catch (err: any) {
      notify(err?.message || 'Failed to change password', 'error');
    }
  };

  const submitProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      notify('Full name is required', 'warning');
      return;
    }
    try {
      await updateProfile({
        variables: {
          input: {
            fullName: profileName.trim(),
            email: profileEmail.trim() || undefined,
            phone: profilePhone.trim() || undefined,
          },
        },
      });
      notify('Profile updated', 'success');
      await refetch();
      setEditingProfile(false);
    } catch (err: any) {
      notify(err?.message || 'Failed to update profile', 'error');
    }
  };

  const displayName =
    meData?.me?.customerProfile?.fullName || meData?.me?.email || user?.email || '-';
  const roleName = meData?.me?.role?.name || user?.roleName || '—';
  const summaryEmail = profileEmail || meData?.me?.email || user?.email || '—';
  const avatarLabel = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Stack spacing={3}>
      <Typography variant="h5">My Profile</Typography>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}>
                {avatarLabel || '?'}
              </Avatar>
              <Stack spacing={0.5}>
                <Typography variant="h6">{displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {roleName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summaryEmail}
                </Typography>
              </Stack>
            </Stack>
            <Button variant="outlined" onClick={() => refetch()}>
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card component={editingProfile ? 'form' : 'div'} onSubmit={submitProfileUpdate}>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle1">Personal Information</Typography>
                  {!editingProfile ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setEditingProfile(true)}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const profile = meData?.me?.customerProfile;
                          setProfileName(profile?.fullName || '');
                          setProfileEmail(profile?.email || meData?.me?.email || '');
                          setProfilePhone(profile?.phone || '');
                          setEditingProfile(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        type="submit"
                        disabled={savingProfile}
                      >
                        Save
                      </Button>
                    </Stack>
                  )}
                </Stack>
                <Divider />
                {!editingProfile ? (
                  <Grid container spacing={2}>
                    <InfoRow label="Full Name" value={profileName} />
                    <InfoRow label="Email Address" value={profileEmail} />
                    <InfoRow label="Phone Number" value={profilePhone} />
                  </Grid>
                ) : (
                  <Stack spacing={1.5}>
                    <TextField
                      label="Full Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                    <TextField
                      label="Email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      type="email"
                    />
                    <TextField
                      label="Phone"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Session</Typography>
                <Divider />
                <Typography><b>Token:</b> {maskToken(token)}</Typography>
                <Typography><b>Issued:</b> {formatDate(iat)}</Typography>
                <Typography><b>Expires:</b> {formatDate(exp)}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={handleCopyToken}>
                    Copy Token
                  </Button>
                  <Button size="small" color="error" variant="contained" onClick={logout}>
                    Logout
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card component="form" onSubmit={submitChangePassword}>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Change Password</Typography>
                <Divider />
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
                  <Button type="submit" variant="contained" disabled={changing}>
                    Change Password
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
