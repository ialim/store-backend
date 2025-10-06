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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../shared/AuthProvider';
import { decodeJwt } from '../shared/jwt';
import { notify } from '../shared/notify';
import {
  useChangePasswordMutation,
  useMeQuery,
  useUpdateMyProfileMutation,
} from '../generated/graphql';
import { useLocation } from 'react-router-dom';

function formatDate(ts?: number) {
  if (!ts) return '—';
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

function maskToken(t?: string | null) {
  if (!t) return '—';
  if (t.length <= 24) return t;
  return `${t.slice(0, 12)}...${t.slice(-8)}`;
}

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography
      variant="caption"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 600,
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontSize: 16, fontWeight: 600, mt: 0.75 }}>
      {value || '—'}
    </Typography>
  </Grid>
);

export default function Profile() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
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

  React.useEffect(() => {
    if (location.hash === '#change-password') {
      const section = document.getElementById('change-password');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.hash]);

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
    meData?.me?.customerProfile?.fullName || meData?.me?.email || user?.email || '—';
  const roleName = meData?.me?.role?.name || user?.roleName || '—';
  const summaryEmail = profileEmail || meData?.me?.email || user?.email || '—';
  const avatarLabel = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 } }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account information and security preferences in one place.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 3, md: 4 }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={3} alignItems="center">
              <Avatar sx={{ width: 88, height: 88, bgcolor: 'success.main', fontSize: 32, fontWeight: 700 }}>
                {avatarLabel || '?'}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {roleName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summaryEmail}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              color="success"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} xl={7}>
          <Card
            component={editingProfile ? 'form' : 'div'}
            onSubmit={submitProfileUpdate}
            sx={{ borderRadius: 4, height: '100%', boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 }, height: '100%' }}>
              <Stack spacing={3} sx={{ height: '100%' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Personal Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Update how your team reaches you.
                    </Typography>
                  </Box>
                  {!editingProfile ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<EditOutlinedIcon />}
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
                        color="success"
                        type="submit"
                        startIcon={<SaveIcon />}
                        disabled={savingProfile}
                      >
                        Save
                      </Button>
                    </Stack>
                  )}
                </Stack>
                <Divider />
                {!editingProfile ? (
                  <Grid container spacing={3}>
                    <InfoRow label="Full Name" value={profileName} />
                    <InfoRow label="Email Address" value={profileEmail} />
                    <InfoRow label="Phone Number" value={profilePhone} />
                  </Grid>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Full Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      type="email"
                      fullWidth
                    />
                    <TextField
                      label="Phone"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      fullWidth
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Session
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Track your current authentication session.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyToken}
                    >
                      Copy
                    </Button>
                  </Stack>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }} color="text.secondary">
                        Token
                      </Typography>
                      <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
                        {maskToken(token)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }} color="text.secondary">
                        Issued
                      </Typography>
                      <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
                        {formatDate(iat)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }} color="text.secondary">
                        Expires
                      </Typography>
                      <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
                        {formatDate(exp)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<ContentCopyIcon />}
                      onClick={handleCopyToken}
                    >
                      Copy Token
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      color="error"
                      variant="contained"
                      startIcon={<LogoutIcon />}
                      onClick={logout}
                    >
                      Logout
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card
              component="form"
              id="change-password"
              onSubmit={submitChangePassword}
              sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Change Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use a strong password to keep your account secure.
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={2}>
                    <TextField
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      helperText="At least 8 characters"
                      fullWidth
                    />
                    <TextField
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <Box>
                    <Button type="submit" variant="contained" color="success" disabled={changing}>
                      Change Password
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
