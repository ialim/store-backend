import { useActivateResellerMutation, useListBillersQuery, useRejectResellerMutation, useResellerProfileQuery } from '../generated/graphql';
import {
  Alert,
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
import { useState } from 'react';
import { useParams } from 'react-router-dom';


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
  const r = data?.resellerProfile;
  const billers = billersData?.listBillers ?? [];
  const [billerId, setBillerId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

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
