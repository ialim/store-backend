import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';
import {
  useSendUserEmailVerificationMutation,
  useStaffDetailQuery,
} from '../generated/graphql';

export default function StaffDetail() {
  const params = useParams<{ id?: string }>();
  const id = params.id ?? '';
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch,
  } = useStaffDetailQuery({
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network' as any,
    errorPolicy: 'all' as any,
  });
  const staff = data?.findUniqueUser;
  const [sendVerification, { loading: sendingVerification }] =
    useSendUserEmailVerificationMutation();

  const stores = React.useMemo(
    () => (staff?.Store ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [staff?.Store],
  );
  const notifications = React.useMemo(() => {
    const rows = (staff?.Notification ?? []).slice();
    rows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return rows.slice(0, 20);
  }, [staff?.Notification]);
  const storeColumns = React.useMemo(
    () =>
      [
        { key: 'name', label: 'Name', sort: true, filter: true },
        {
          key: 'isMain',
          label: 'Main',
          render: (s: any) => (s.isMain ? 'Yes' : 'No'),
          sort: true,
          accessor: (s: any) => (s.isMain ? 1 : 0),
        },
        { key: 'location', label: 'Location', sort: true, filter: true },
      ] as any,
    [],
  );
  const notificationColumns = React.useMemo(
    () =>
      [
        { key: 'type', label: 'Type', sort: true, filter: true },
        { key: 'message', label: 'Message', filter: true },
        {
          key: 'createdAt',
          label: 'Created',
          render: (n: any) => new Date(n.createdAt).toLocaleString(),
          sort: true,
          accessor: (n: any) => new Date(n.createdAt || 0),
        },
        {
          key: 'isRead',
          label: 'Read',
          render: (n: any) => (n.isRead ? 'Yes' : 'No'),
          sort: true,
          accessor: (n: any) => (n.isRead ? 1 : 0),
        },
      ] as any,
    [],
  );

  if (!params.id) {
    return <Alert severity="error">Missing staff id.</Alert>;
  }
  if (loading && !staff) {
    return <Skeleton variant="rectangular" height={180} />;
  }
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
        {error.message}
      </Alert>
    );
  }
  if (!staff) {
    return <Alert severity="info">Staff member not found.</Alert>;
  }

  const createdAt = new Date(staff.createdAt).toLocaleString();
  const updatedAt = new Date(staff.updatedAt).toLocaleString();
  const verifiedChip = staff.isEmailVerified ? (
    <Chip color="success" size="small" label="Email verified" />
  ) : (
    <Chip color="warning" size="small" label="Email not verified" />
  );

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(staff.email);
      notify('Email copied to clipboard', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to copy email', 'error');
    }
  };

  const resendVerification = async () => {
    try {
      await sendVerification({ variables: { userId: staff.id } });
      notify('Verification email sent', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to send verification email', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Typography variant="h5">Staff Detail</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button variant="outlined" onClick={() => void refetch()}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Overview
          </Typography>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" fontWeight={500}>
                {staff.email}
              </Typography>
              {verifiedChip}
              <Chip size="small" label={staff.role?.name || '—'} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={copyEmail}>
                Copy email
              </Button>
              {!staff.isEmailVerified && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={resendVerification}
                  disabled={sendingVerification}
                >
                  {sendingVerification ? 'Sending…' : 'Resend verification'}
                </Button>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              User ID: {staff.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {createdAt}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated: {updatedAt}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Managed Stores
              </Typography>
              <TableList
                columns={storeColumns}
                rows={stores}
                loading={loading}
                emptyMessage="No stores assigned"
                getRowKey={(s: any) => s.id}
                defaultSortKey="name"
                showFilters
                globalSearch
                globalSearchPlaceholder="Search stores"
                globalSearchKeys={['name', 'location']}
                enableUrlState
                urlKey="staff_stores"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Recent Notifications
              </Typography>
              <TableList
                columns={notificationColumns}
                rows={notifications}
                loading={loading}
                emptyMessage="No notifications"
                getRowKey={(n: any) => n.id}
                defaultSortKey="createdAt"
                showFilters
                globalSearch
                globalSearchPlaceholder="Search notifications"
                globalSearchKeys={['type', 'message']}
                enableUrlState
                urlKey="staff_notifications"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
