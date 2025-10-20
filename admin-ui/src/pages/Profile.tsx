import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  AssetKind,
  UpdateResellerBrandingInput,
  UpdateMyResellerBrandingMutationVariables,
  useChangePasswordMutation,
  useMeQuery,
  useMyResellerProfileQuery,
  useUpdateMyProfileMutation,
  useUpdateMyResellerBrandingMutation,
} from '../generated/graphql';
import { useLocation } from 'react-router-dom';
import { uploadAsset } from '../shared/assets';
import { formatMoney } from '../shared/format';

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

function profileStatusColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

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
  const [companyNameDraft, setCompanyNameDraft] = React.useState('');
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [changePassword, { loading: changing }] = useChangePasswordMutation();
  const [updateProfile, { loading: savingProfile }] = useUpdateMyProfileMutation();
  const rawRoleName = meData?.me?.role?.name || user?.roleName || null;
  const isReseller = rawRoleName === 'RESELLER';
  const {
    data: resellerData,
    refetch: refetchReseller,
  } = useMyResellerProfileQuery({
    skip: !isReseller,
    fetchPolicy: 'cache-and-network' as any,
  });
  const resellerProfile = resellerData?.myResellerProfile;
  const [brandingInitials, setBrandingInitials] = React.useState('');
  const [brandingLogoUrl, setBrandingLogoUrl] = React.useState<string | null>(null);
  const [uploadingBrandingLogo, setUploadingBrandingLogo] = React.useState(false);
  const [
    updateResellerBrandingMutation,
    { loading: updatingResellerBranding },
  ] = useUpdateMyResellerBrandingMutation();

  React.useEffect(() => {
    if (isReseller && resellerProfile) {
      setProfileName(resellerProfile.contactPersonName || '');
      setProfileEmail(resellerProfile.user?.email || meData?.me?.email || '');
      setProfilePhone(resellerProfile.contactPhone || '');
      setCompanyNameDraft(resellerProfile.companyName || '');
      setBrandingInitials(resellerProfile.companyInitials || '');
      setBrandingLogoUrl(resellerProfile.companyLogoUrl ?? null);
      setEditingProfile(false);
      return;
    }
    const profile = meData?.me?.customerProfile;
    setProfileName(profile?.fullName || '');
    setProfileEmail(profile?.email || meData?.me?.email || '');
    setProfilePhone(profile?.phone || '');
    setCompanyNameDraft('');
    setEditingProfile(false);
  }, [
    isReseller,
    resellerProfile?.companyInitials,
    resellerProfile?.companyLogoUrl,
    resellerProfile?.companyName,
    resellerProfile?.contactPersonName,
    resellerProfile?.contactPhone,
    resellerProfile?.user?.email,
    meData?.me?.customerProfile,
    meData?.me?.email,
  ]);

  const persistResellerBranding = React.useCallback(
    async (input: { companyInitials?: string | null; companyLogoUrl?: string | null }) => {
      try {
        const result = await updateResellerBrandingMutation({
          variables: { input },
        });
        const updated = result.data?.updateMyResellerBranding;
        if (updated) {
          setBrandingInitials(updated.companyInitials || '');
          setBrandingLogoUrl(updated.companyLogoUrl ?? null);
        }
        notify('Branding updated', 'success');
        await refetchReseller();
      } catch (err: any) {
        notify(err?.message || 'Failed to update branding', 'error');
      }
    },
    [updateResellerBrandingMutation, refetchReseller],
  );

  const handleResellerBrandingSave = async () => {
    if (!isReseller) return;
    const normalized = brandingInitials.trim().toUpperCase().slice(0, 3) || null;
    await persistResellerBranding({ companyInitials: normalized });
  };

  const handleResellerLogoUpload = async (file?: File | null) => {
    if (!file) return;
    setUploadingBrandingLogo(true);
    try {
      const asset = await uploadAsset({ file, kind: AssetKind.Image });
      await persistResellerBranding({ companyLogoUrl: asset.url });
    } catch (err: any) {
      notify(err?.message || 'Failed to upload logo', 'error');
    } finally {
      setUploadingBrandingLogo(false);
    }
  };

  const handleResellerLogoRemove = async () => {
    if (!isReseller) return;
    await persistResellerBranding({ companyLogoUrl: null });
  };

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
    if (isReseller && !companyNameDraft.trim()) {
      notify('Company name is required', 'warning');
      return;
    }
    try {
      if (isReseller) {
        const brandingInput = {
          companyName: companyNameDraft.trim(),
          contactPersonName: profileName.trim(),
          contactPhone: profilePhone.trim() || null,
        } satisfies UpdateResellerBrandingInput;

        const variables: UpdateMyResellerBrandingMutationVariables = {
          input: brandingInput,
        };
        await updateResellerBrandingMutation({ variables });
        notify('Profile updated', 'success');
        await Promise.all([refetch(), refetchReseller()]);
        setEditingProfile(false);
      } else {
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
      }
    } catch (err: any) {
      notify(err?.message || 'Failed to update profile', 'error');
    }
  };

  const roleName = rawRoleName || '—';
  const displayName = isReseller
    ? resellerProfile?.companyName || meData?.me?.email || user?.email || '—'
    : meData?.me?.customerProfile?.fullName || meData?.me?.email || user?.email || '—';
  const summaryEmail = isReseller
    ? resellerProfile?.user?.email || meData?.me?.email || user?.email || '—'
    : profileEmail || meData?.me?.email || user?.email || '—';
  const defaultAvatarLabel = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const brandingPreviewInitials =
    ((brandingInitials || resellerProfile?.companyInitials || resellerProfile?.companyName || '')
      .trim()
      .slice(0, 3)
      .toUpperCase() || '—');
  const avatarLabel = isReseller ? brandingPreviewInitials : defaultAvatarLabel;
  const avatarSrc = isReseller && brandingLogoUrl ? brandingLogoUrl : undefined;
  const allowProfileEditing = true;
  const profileSummary = (
    <Grid container spacing={3}>
      <InfoRow label={isReseller ? 'Contact Person' : 'Full Name'} value={profileName || '—'} />
      <InfoRow label={isReseller ? 'Contact Email' : 'Email Address'} value={profileEmail || '—'} />
      <InfoRow label={isReseller ? 'Contact Phone' : 'Phone Number'} value={profilePhone || '—'} />
    </Grid>
  );

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
              <Avatar
                sx={{
                  width: 88,
                  height: 88,
                  bgcolor: isReseller ? 'success.light' : 'success.main',
                  color: isReseller ? 'success.dark' : 'common.white',
                  fontSize: 32,
                  fontWeight: 700,
                }}
                src={avatarSrc ?? undefined}
                variant={isReseller ? 'rounded' : 'circular'}
              >
                {!avatarSrc ? avatarLabel || '?' : null}
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
          <Stack spacing={3}>
            <Card
              component={allowProfileEditing && editingProfile ? 'form' : 'div'}
              onSubmit={allowProfileEditing ? submitProfileUpdate : undefined}
              sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Personal Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Update how your team reaches you.
                      </Typography>
                    </Box>
                    {allowProfileEditing &&
                      (!editingProfile ? (
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
                              if (isReseller && resellerProfile) {
                                setProfileName(resellerProfile.contactPersonName || '');
                                setProfileEmail(resellerProfile.user?.email || meData?.me?.email || '');
                                setProfilePhone(resellerProfile.contactPhone || '');
                                setCompanyNameDraft(resellerProfile.companyName || '');
                              } else {
                                const profile = meData?.me?.customerProfile;
                                setProfileName(profile?.fullName || '');
                                setProfileEmail(profile?.email || meData?.me?.email || '');
                                setProfilePhone(profile?.phone || '');
                                setCompanyNameDraft('');
                              }
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
                      ))}
                  </Stack>
                  <Divider />
                  {allowProfileEditing ? (
                    !editingProfile ? (
                      profileSummary
                    ) : (
                      <Stack spacing={2}>
                        {isReseller && (
                          <TextField
                            label="Company Name"
                            value={companyNameDraft}
                            onChange={(e) => setCompanyNameDraft(e.target.value)}
                            required
                            fullWidth
                          />
                        )}
                        <TextField
                          label={isReseller ? 'Contact Person' : 'Full Name'}
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          fullWidth
                        />
                        <TextField
                          label={isReseller ? 'Contact Email' : 'Email'}
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          type="email"
                          fullWidth
                          disabled={isReseller}
                        />
                        <TextField
                          label={isReseller ? 'Contact Phone' : 'Phone'}
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          fullWidth
                        />
                      </Stack>
                    )
                  ) : (
                    profileSummary
                  )}
                </Stack>
              </CardContent>
            </Card>

            {isReseller && resellerProfile && (
              <Card sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Business Profile
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Review your reseller account status and branding.
                      </Typography>
                    </Box>
                    <Divider />
                    <Grid container spacing={3}>
                      <InfoRow label="Company Name" value={resellerProfile.companyName || '—'} />
                      <InfoRow
                        label="Tier"
                        value={<Chip label={resellerProfile.tier} color="success" size="small" />}
                      />
                      <InfoRow
                        label="Credit Limit"
                        value={formatMoney(resellerProfile.creditLimit)}
                      />
                      <InfoRow
                        label="Outstanding Balance"
                        value={formatMoney(resellerProfile.outstandingBalance)}
                      />
                      <InfoRow
                        label="Account Status"
                        value={
                          <Chip
                            label={resellerProfile.profileStatus}
                            color={profileStatusColor(resellerProfile.profileStatus) as any}
                            size="small"
                          />
                        }
                      />
                      <InfoRow
                        label="Assigned Store Admin"
                        value={resellerProfile.biller?.email || '—'}
                      />
                    </Grid>
                    <Divider />
                    <Typography variant="subtitle2" color="text.secondary">
                      Branding
                    </Typography>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems="center"
                    >
                      <Avatar
                        src={brandingLogoUrl ?? undefined}
                        alt={resellerProfile.companyName}
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: 'success.light',
                          color: 'success.dark',
                          fontWeight: 700,
                          fontSize: 28,
                        }}
                        variant="rounded"
                      >
                        {!brandingLogoUrl ? brandingPreviewInitials : null}
                      </Avatar>
                      <Stack spacing={1} sx={{ width: '100%' }}>
                        <TextField
                          label="Company Initials"
                          value={brandingInitials}
                          onChange={(e) =>
                            setBrandingInitials(e.target.value.toUpperCase().slice(0, 3))
                          }
                          inputProps={{
                            maxLength: 3,
                            style: { textTransform: 'uppercase', letterSpacing: '0.3em' },
                          }}
                          helperText="Up to 3 characters. Leave blank to derive from company name."
                          size="small"
                        />
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Button
                            variant="contained"
                            onClick={handleResellerBrandingSave}
                            disabled={updatingResellerBranding}
                          >
                            {updatingResellerBranding ? 'Saving…' : 'Save Branding'}
                          </Button>
                          <Button
                            variant="outlined"
                            component="label"
                            disabled={uploadingBrandingLogo}
                          >
                            {uploadingBrandingLogo ? 'Uploading…' : 'Upload Logo'}
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void handleResellerLogoUpload(file);
                                event.target.value = '';
                              }}
                            />
                          </Button>
                          {brandingLogoUrl && (
                            <Button
                              variant="text"
                              color="error"
                              onClick={handleResellerLogoRemove}
                              disabled={updatingResellerBranding}
                            >
                              Remove Logo
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            {!isReseller && (
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
            )}

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
