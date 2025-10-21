import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
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
import LaunchIcon from '@mui/icons-material/Launch';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Orders, ConsumerSales, ResellerSales } from '../operations/orders';
import { useAuth } from '../shared/AuthProvider';
import { formatMoney } from '../shared/format';

type OrdersData = {
  ordersQuery: Array<{
    id: string;
    status?: string | null;
    phase?: string | null;
    billerId?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    fulfillment?: { status?: string | null } | null;
    quotation?: {
      id: string;
      status?: string | null;
      billerId?: string | null;
      type?: string | null;
      totalAmount?: number | null;
      updatedAt?: string | null;
    } | null;
  }>;
};

type ConsumerSalesData = {
  consumerSales: Array<{
    id: string;
    saleOrderId: string;
    billerId?: string | null;
    totalAmount: number;
    status: string;
    createdAt: string;
    customer?: {
      customerProfile?: { fullName?: string | null } | null;
      fullName?: string | null;
      email?: string | null;
    } | null;
  }>;
};

type ResellerSalesData = {
  resellerSales: Array<{
    id: string;
    SaleOrderid: string;
    billerId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    reseller?: {
      customerProfile?: { fullName?: string | null } | null;
      fullName?: string | null;
      email?: string | null;
    } | null;
  }>;
};

type BillerSale = {
  id: string;
  kind: 'CONSUMER' | 'RESELLER';
  saleOrderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  partyLabel: string;
};

type SummaryCard = {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value ?? '—';
  }
}

function statusColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'FULFILLED':
    case 'PAID':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    case 'PENDING':
    case 'DRAFT':
    case 'SENT':
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'warning';
    default:
      return 'default';
  }
}

export default function BillerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const billerId = user?.id ?? null;

  const {
    data: ordersData,
    loading: ordersLoading,
    error: ordersError,
  } = useQuery<OrdersData>(Orders, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: consumerSalesData,
    loading: consumerSalesLoading,
    error: consumerSalesError,
  } = useQuery<ConsumerSalesData>(ConsumerSales, {
    fetchPolicy: 'cache-and-network',
    skip: !billerId,
  });

  const {
    data: resellerSalesData,
    loading: resellerSalesLoading,
    error: resellerSalesError,
  } = useQuery<ResellerSalesData>(ResellerSales, {
    fetchPolicy: 'cache-and-network',
    skip: !billerId,
  });

  const assignedOrders = React.useMemo(() => {
    if (!billerId) return [];
    return (ordersData?.ordersQuery ?? []).filter(
      (order) => (order.billerId ?? '').toLowerCase() === billerId.toLowerCase(),
    );
  }, [ordersData?.ordersQuery, billerId]);

  const openOrders = React.useMemo(
    () =>
      assignedOrders.filter((order) => {
        const status = (order.status || '').toUpperCase();
        return status && !['COMPLETED', 'CANCELLED'].includes(status);
      }),
    [assignedOrders],
  );

  const pendingFulfillments = React.useMemo(
    () =>
      assignedOrders.filter((order) => {
        const fulfillmentStatus = (order.fulfillment?.status || '').toUpperCase();
        return ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(fulfillmentStatus);
      }),
    [assignedOrders],
  );

  const pendingQuotations = React.useMemo(
    () =>
      assignedOrders.filter((order) => {
        const quotation = order.quotation;
        if (!quotation) return false;
        const belongsToBiller =
          (quotation.billerId ?? '').toLowerCase() === (billerId ?? '').toLowerCase();
        const status = (quotation.status || '').toUpperCase();
        return (
          belongsToBiller &&
          ['DRAFT', 'SENT', 'CONFIRMED'].includes(status)
        );
      }),
    [assignedOrders, billerId],
  );

  const consumerSales = consumerSalesData?.consumerSales ?? [];
  const resellerSales = resellerSalesData?.resellerSales ?? [];

  const mySales = React.useMemo<BillerSale[]>(() => {
    if (!billerId) return [];
    const normalized = billerId.toLowerCase();

    const formatPartyLabel = (input?: {
      customerProfile?: { fullName?: string | null } | null;
      fullName?: string | null;
      email?: string | null;
    } | null) => {
      const profileName = input?.customerProfile?.fullName?.trim();
      if (profileName) return profileName;
      const directName = input?.fullName?.trim();
      if (directName) return directName;
      const email = input?.email?.trim();
      if (email) return email;
      return '—';
    };

    const consumer: BillerSale[] = consumerSales
      .filter((sale) => (sale.billerId ?? '').toLowerCase() === normalized)
      .map((sale) => ({
        id: sale.id,
        kind: 'CONSUMER' as const,
        saleOrderId: sale.saleOrderId,
        status: sale.status,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
        partyLabel: formatPartyLabel(sale.customer),
      }));

    const resellerMapped: BillerSale[] = resellerSales
      .filter((sale) => (sale.billerId ?? '').toLowerCase() === normalized)
      .map((sale) => ({
        id: sale.id,
        kind: 'RESELLER' as const,
        saleOrderId: sale.SaleOrderid,
        status: sale.status,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
        partyLabel: formatPartyLabel(sale.reseller),
      }));

    return [...consumer, ...resellerMapped].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [consumerSales, resellerSales, billerId]);

  const totalSalesValue = React.useMemo(
    () => mySales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0),
    [mySales],
  );

  const recentSales = React.useMemo(() => mySales.slice(0, 5), [mySales]);

  const anyError = ordersError || consumerSalesError || resellerSalesError;

  const summaryCards: SummaryCard[] = [
    {
      title: 'Assigned Orders',
      value: openOrders.length.toString(),
      helper: `${openOrders.length} open / ${assignedOrders.length} total`,
      icon: <LaunchIcon fontSize="small" color="primary" />,
      actionLabel: 'View orders',
      onAction: () => navigate('/orders'),
      loading: ordersLoading,
    },
    {
      title: 'Quotations In Progress',
      value: pendingQuotations.length.toString(),
      helper: 'Draft, sent, or awaiting confirmation',
      icon: <AssignmentIcon fontSize="small" color="primary" />,
      actionLabel: 'Manage quotations',
      onAction: () => navigate('/orders/quotations'),
      loading: ordersLoading,
    },
    {
      title: 'Recent Sales',
      value: mySales.length.toString(),
      helper: formatMoney(totalSalesValue),
      icon: <LocalMallIcon fontSize="small" color="primary" />,
      actionLabel: 'Review sales',
      onAction: () => navigate('/orders/sales'),
      loading: consumerSalesLoading || resellerSalesLoading,
    },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Biller Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track the orders, quotations, and sales you are responsible for.
        </Typography>
      </Box>

      {anyError && (
        <Alert severity="error">
          {ordersError?.message ||
            consumerSalesError?.message ||
            resellerSalesError?.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        {summaryCards.map((card) => (
          <Grid item xs={12} md={4} key={card.title}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(16, 94, 62, 0.08)',
                height: '100%',
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {card.icon}
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                </Stack>
                {card.loading ? (
                  <Skeleton variant="text" width={120} height={36} />
                ) : (
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {card.value}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {card.helper}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={card.onAction}
                  endIcon={<LaunchIcon fontSize="small" />}
                >
                  {card.actionLabel}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ReceiptLongIcon fontSize="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Orders needing attention
                </Typography>
              </Stack>
              {ordersLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rectangular" height={52} />
                  <Skeleton variant="rectangular" height={52} />
                </Stack>
              ) : openOrders.length ? (
                <Stack spacing={1.5}>
                  {openOrders.slice(0, 5).map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(16,94,62,0.12)',
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 600 }}>
                          #{order.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated {formatDate(order.updatedAt || order.createdAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          color={statusColor(order.status ?? undefined) as any}
                          label={order.status ?? 'Unknown'}
                        />
                        {order.quotation?.status && (
                          <Chip
                            size="small"
                            variant="outlined"
                            color={statusColor(order.quotation.status ?? undefined) as any}
                            label={`Quote: ${order.quotation.status}`}
                          />
                        )}
                        <Button
                          size="small"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          Open
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1} alignItems="flex-start">
                  <Typography color="text.secondary">
                    You have no active orders right now.
                  </Typography>
                  <Button size="small" variant="text" onClick={() => navigate('/orders')}>
                    Go to orders
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalMallIcon fontSize="small" color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent sales
                </Typography>
              </Stack>
              {consumerSalesLoading || resellerSalesLoading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rectangular" height={52} />
                  <Skeleton variant="rectangular" height={52} />
                </Stack>
              ) : recentSales.length ? (
                <Stack spacing={1.5}>
                  {recentSales.map((sale) => (
                    <Box
                      key={sale.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(16,94,62,0.12)',
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            {sale.kind === 'RESELLER' ? 'Reseller' : 'Customer'} sale #{sale.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {sale.partyLabel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(sale.createdAt)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          color={statusColor(sale.status) as any}
                          label={sale.status}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatMoney(sale.totalAmount)}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/orders/sales/${sale.kind.toLowerCase()}/${sale.id}`)
                          }
                        >
                          View
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Stack spacing={1} alignItems="flex-start">
                  <Typography color="text.secondary">
                    No recent sales recorded for you yet. Create a quotation to get started.
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => navigate('/orders/quotations/new')}
                  >
                    New quotation
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick actions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Jump into the workflows you use most.
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" onClick={() => navigate('/orders/quotations/new')}>
                Create quotation
              </Button>
              <Button variant="outlined" onClick={() => navigate('/orders/quotations')}>
                Manage quotations
              </Button>
              <Button variant="outlined" onClick={() => navigate('/orders/sales')}>
                Review sales
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
