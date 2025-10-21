import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  useMyResellerProfileQuery,
  useOrdersQuery,
  useResellerSalesQuery,
} from '../generated/graphql';
import { formatMoney } from '../shared/format';

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusChipColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'FULFILLED':
    case 'PAID':
      return 'success';
    case 'PENDING':
    case 'PROCESSING':
    case 'IN_PROGRESS':
      return 'warning';
    case 'CANCELLED':
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

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

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
  } = useMyResellerProfileQuery({ fetchPolicy: 'cache-and-network' as any });
  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
  } = useOrdersQuery({ fetchPolicy: 'cache-and-network' });
  const {
    data: salesData,
    loading: salesLoading,
    error: salesError,
  } = useResellerSalesQuery({ fetchPolicy: 'cache-and-network' });

  const profile = profileData?.myResellerProfile;
  const orders = ordersData?.ordersQuery ?? [];
  const sales = salesData?.resellerSales ?? [];

  const openOrders = React.useMemo(
    () =>
      orders.filter(
        (order) =>
          !['COMPLETED', 'CANCELLED'].includes((order.status || '').toUpperCase()),
      ),
    [orders],
  );

  const activeSales = React.useMemo(
    () =>
      sales.filter(
        (sale) =>
          !['COMPLETED', 'FULFILLED', 'PAID'].includes(
            (sale.status || '').toUpperCase(),
          ),
      ),
    [sales],
  );

  const pendingFulfillments = React.useMemo(
    () =>
      orders.filter((order) =>
        ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(
          (order.fulfillment?.status || '').toUpperCase(),
        ),
      ),
    [orders],
  );

  const recentOrders = React.useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || '').getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || '').getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [orders]);

  const recentSales = React.useMemo(() => {
    return [...sales]
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || '').getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || '').getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [sales]);

  const hasAnyError = profileError || ordersError || salesError;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Snapshot of your recent activity and account health.
        </Typography>
      </Box>

      {hasAnyError && (
        <Alert severity="error">
          {profileError?.message || ordersError?.message || salesError?.message}
        </Alert>
      )}

      <Card sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {profileLoading ? (
            <Skeleton variant="rectangular" height={96} />
          ) : (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {profile?.companyName || 'Welcome back'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tier {profile?.tier || '—'} • Outstanding{' '}
                  {formatMoney(profile?.outstandingBalance ?? 0)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`Status: ${profile?.profileStatus ?? '—'}`}
                  color={profileStatusColor(profile?.profileStatus) as any}
                  size="small"
                />
                <Chip
                  label={`Credit limit ${formatMoney(profile?.creditLimit ?? 0)}`}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {[
          {
            label: 'Active Orders',
            value: ordersLoading ? null : openOrders.length,
            description: 'Orders currently in progress.',
            action: () => navigate('/orders'),
            actionLabel: 'View Orders',
          },
          {
            label: 'Sales Pipeline',
            value: salesLoading ? null : activeSales.length,
            description: 'Sales awaiting completion or payment.',
            action: () => navigate('/orders/sales'),
            actionLabel: 'Review Sales',
          },
          {
            label: 'Pending Fulfilments',
            value: ordersLoading ? null : pendingFulfillments.length,
            description: 'Fulfilment tasks to monitor.',
            action: () => navigate('/fulfillments'),
            actionLabel: 'Track Fulfilments',
          },
          {
            label: 'Outstanding Balance',
            value: profileLoading ? null : formatMoney(profile?.outstandingBalance ?? 0),
            description: 'Amount remaining on your account.',
            action: () => navigate('/accounts'),
            actionLabel: 'Manage Accounts',
          },
        ].map((metric) => (
          <Grid item xs={12} sm={6} key={metric.label}>
            <Card
              sx={{
                borderRadius: 4,
                height: '100%',
                boxShadow: '0 20px 32px rgba(16, 94, 62, 0.08)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: 1 }}>
                  {metric.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, my: 1.5 }}>
                  {metric.value === null ? <Skeleton width={96} /> : metric.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {metric.description}
                </Typography>
                <Button size="small" variant="text" color="success" onClick={metric.action}>
                  {metric.actionLabel}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Orders
                </Typography>
                <Button size="small" variant="text" onClick={() => navigate('/orders')}>
                  View all
                </Button>
              </Stack>
              {ordersLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="65%" />
                  <Skeleton variant="text" width="70%" />
                </Stack>
              ) : recentOrders.length ? (
                <Stack spacing={1.5}>
                  {recentOrders.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1.5,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 600 }}>{order.id}</Typography>
                        <Chip
                          label={order.status || '—'}
                          color={statusChipColor(order.status) as any}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {formatDate(order.updatedAt || order.createdAt)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        Total {formatMoney(order.totalAmount ?? 0)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No orders recorded yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Sales
                </Typography>
                <Button size="small" variant="text" onClick={() => navigate('/orders/sales')}>
                  View all
                </Button>
              </Stack>
              {salesLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="65%" />
                  <Skeleton variant="text" width="70%" />
                </Stack>
              ) : recentSales.length ? (
                <Stack spacing={1.5}>
                  {recentSales.map((sale) => (
                    <Box
                      key={sale.id}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1.5,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 600 }}>{sale.id}</Typography>
                        <Chip
                          label={sale.status || '—'}
                          color={statusChipColor(sale.status) as any}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {formatDate(sale.updatedAt || sale.createdAt)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>
                        Value {formatMoney(sale.totalAmount ?? 0)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No reseller sales recorded yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

