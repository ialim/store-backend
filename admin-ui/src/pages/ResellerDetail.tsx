import {
  AssetKind,
  useActivateResellerMutation,
  useListBillersQuery,
  useRejectResellerMutation,
  useResellerProfileQuery,
  useUpdateResellerBrandingMutation,
} from '../generated/graphql';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { notify } from '../shared/notify';
import { formatMoney } from '../shared/format';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { uploadAsset } from '../shared/assets';


function statusColor(s?: string) {
  switch ((s || '').toUpperCase()) {
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

export default function ResellerDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useResellerProfileQuery({ variables: { userId: id as string }, fetchPolicy: 'cache-and-network' as any, errorPolicy: 'all' as any });
  const { data: billersData } = useListBillersQuery({ fetchPolicy: 'cache-first' as any, errorPolicy: 'all' as any });
  const [activate, { loading: activating }] = useActivateResellerMutation();
  const [reject, { loading: rejecting }] = useRejectResellerMutation();
  const [updateBranding, { loading: updatingBranding }] = useUpdateResellerBrandingMutation();
  const r = data?.resellerProfile;
  const [brandingInitials, setBrandingInitials] = useState('');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const billers = billersData?.listBillers ?? [];
  const [billerId, setBillerId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    setBrandingInitials(r?.companyInitials || '');
    setBrandingLogoUrl(r?.companyLogoUrl ?? null);
  }, [r?.companyInitials, r?.companyLogoUrl]);

  const persistBranding = async (input: {
    companyInitials?: string | null;
    companyLogoUrl?: string | null;
  }) => {
    if (!r) return;
    try {
      const result = await updateBranding({
        variables: { resellerId: r.userId, input },
      });
      const updated = result.data?.updateResellerBranding;
      if (updated) {
        setBrandingInitials(updated.companyInitials || '');
        setBrandingLogoUrl(updated.companyLogoUrl ?? null);
      }
      notify('Branding updated', 'success');
      await refetch();
    } catch (err: any) {
      notify(err?.message || 'Failed to update branding', 'error');
    }
  };

  const handleSaveBranding = async () => {
    const normalized = brandingInitials.trim().toUpperCase().slice(0, 3) || null;
    await persistBranding({ companyInitials: normalized });
  };

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const asset = await uploadAsset({ file, kind: AssetKind.Image });
      await persistBranding({ companyLogoUrl: asset.url });
    } catch (err: any) {
      notify(err?.message || 'Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    await persistBranding({ companyLogoUrl: null });
  };

  if (loading && !r) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rectangular" height={160} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!r) return <Alert severity="info">Reseller not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">{r.user?.email}</Typography>
        <Chip
          label={r.profileStatus}
          color={statusColor(r.profileStatus) as any}
          size="small"
        />
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Profile
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography>Company: {r.companyName || '—'}</Typography>
                <Typography>Contact Person: {r.contactPersonName || '—'}</Typography>
                <Typography>Contact Phone: {r.contactPhone || '—'}</Typography>
                <Typography>Tier: {r.tier}</Typography>
                <Typography>Credit Limit: {formatMoney(r.creditLimit)}</Typography>
              <Typography>Outstanding: {formatMoney(r.outstandingBalance)}</Typography>
              <Typography>
                Requested At:{' '}
                {r.requestedAt
                  ? new Date(r.requestedAt).toLocaleString()
                  : '—'}
                </Typography>
                <Typography>
                  Activated At:{' '}
                  {r.activatedAt
                    ? new Date(r.activatedAt).toLocaleString()
                    : '—'}
                </Typography>
                {r.rejectedAt && (
                  <Typography>
                    Rejected At: {new Date(r.rejectedAt).toLocaleString()}
                  </Typography>
                )}
                {r.rejectionReason && (
                  <Typography>Reason: {r.rejectionReason}</Typography>
                )}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Branding
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Avatar
                  src={brandingLogoUrl ?? undefined}
                  alt={r.companyName}
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
                  {!brandingLogoUrl &&
                    ((brandingInitials || r.companyInitials || r.companyName || '')
                      .trim()
                      .slice(0, 3)
                      .toUpperCase() || '—')}
                </Avatar>
                <Stack spacing={1} sx={{ width: '100%' }}>
                  <TextField
                    label="Company Initials"
                    value={brandingInitials}
                    onChange={(e) =>
                      setBrandingInitials(
                        e.target.value.toUpperCase().slice(0, 3),
                      )
                    }
                    inputProps={{ maxLength: 3, style: { textTransform: 'uppercase', letterSpacing: '0.3em' } }}
                    helperText="Up to 3 characters. Leave empty to derive from company name."
                    size="small"
                  />
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button
                      variant="contained"
                      onClick={handleSaveBranding}
                      disabled={updatingBranding}
                    >
                      {updatingBranding ? 'Saving…' : 'Save Branding'}
                    </Button>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void handleLogoUpload(file);
                          event.target.value = '';
                        }}
                      />
                    </Button>
                    {brandingLogoUrl && (
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleRemoveLogo}
                        disabled={updatingBranding}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Biller
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography>Assigned: {r.biller?.email || '—'}</Typography>
                <Typography>
                  Requested: {r.requestedBiller?.email || '—'}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  <Select
                    size="small"
                    value={
                      billerId || r.biller?.id || r.requestedBiller?.id || ''
                    }
                    onChange={(e) => setBillerId(e.target.value)}
                    displayEmpty
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="">
                      <em>No biller</em>
                    </MenuItem>
                    {billers.map((b: any) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.email}
                      </MenuItem>
                    ))}
                  </Select>
                  <Button
                    variant="contained"
                    disabled={activating}
                    onClick={async () => {
                      const ok = window.confirm(
                        `Activate ${r.user?.email || 'this reseller'}?`,
                      );
                      if (!ok) return;
                      try {
                        await activate({
                          variables: {
                            resellerId: r.userId,
                            billerId: billerId || null,
                          },
                        });
                        notify(`Activated ${r.user?.email}`, 'success');
                        await refetch();
                      } catch (e: any) {
                        notify(e?.message || 'Activation failed', 'error');
                      }
                    }}
                  >
                    {activating ? 'Activating…' : 'Activate'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box>
        <Divider />
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Reject Application
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason"
                  fullWidth
                />
                <Button
                  color="error"
                  variant="contained"
                  disabled={rejecting}
                  onClick={async () => {
                    const ok = window.confirm(
                      `Reject ${r.user?.email || 'this reseller'}?`,
                    );
                    if (!ok) return;
                    try {
                      await reject({
                        variables: { resellerId: r.userId, reason },
                      });
                      setReason('');
                      notify(`Rejected ${r.user?.email}`, 'success');
                      await refetch();
                    } catch (e: any) {
                      notify(e?.message || 'Rejection failed', 'error');
                    }
                  }}
                >
                  {rejecting ? 'Rejecting…' : 'Reject'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
