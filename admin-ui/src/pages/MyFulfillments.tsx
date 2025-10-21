import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { useMyAssignedFulfillmentsQuery, type MyAssignedFulfillmentsQuery } from '../generated/graphql';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';

type FulfillmentNode = NonNullable<MyAssignedFulfillmentsQuery['myAssignedFulfillments']>[number];
type PaymentNode = NonNullable<FulfillmentNode['payments']>[number];
type EnrichedFulfillmentRow = FulfillmentNode & {
  payments: PaymentNode[];
  totalPaid: number;
  outstanding: number;
  partyLabel: string;
  storeLabel: string;
  lastPayment: PaymentNode | null;
};

function statusColor(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'ASSIGNED':
      return 'info';
    case 'IN_TRANSIT':
      return 'warning';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'default';
    default:
      return 'default';
  }
}

function paymentChipColor(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'PAID':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    default:
      return 'default';
  }
}

function costChipColor(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    default:
      return 'warning';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatRelative(value?: string | null) {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

export default function MyFulfillments() {
  const { data, loading, error, refetch } = useMyAssignedFulfillmentsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const rows = React.useMemo<EnrichedFulfillmentRow[]>(() => {
    const list = (data?.myAssignedFulfillments ?? []) as FulfillmentNode[];
    return list.map((fulfillment) => {
      const payments = (fulfillment.payments ?? []) as PaymentNode[];
      const { cost, saleOrder } = fulfillment;
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const outstanding =
        cost != null && totalPaid < cost ? Math.max(cost - totalPaid, 0) : 0;
      const partyLabel = saleOrder?.consumerSale?.customer?.fullName
        || saleOrder?.resellerSale?.reseller?.customerProfile?.fullName
        || saleOrder?.resellerSale?.reseller?.email
        || saleOrder?.consumerSale?.customer?.email
        || '—';
      const consumerStore = saleOrder?.consumerSale?.store;
      const resellerStore = saleOrder?.resellerSale?.store;
      const storeLabel = consumerStore
        ? consumerStore.location
          ? `${consumerStore.name} • ${consumerStore.location}`
          : consumerStore.name
        : resellerStore
        ? resellerStore.location
          ? `${resellerStore.name} • ${resellerStore.location}`
          : resellerStore.name
        : saleOrder?.storeId ?? '—';
      return {
        ...fulfillment,
        payments,
        totalPaid,
        outstanding,
        partyLabel,
        storeLabel,
        lastPayment: payments.length ? payments[0] : null,
      } satisfies EnrichedFulfillmentRow;
    });
  }, [data?.myAssignedFulfillments]);


  type Row = EnrichedFulfillmentRow;

  const columns = React.useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      render: (row: Row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={row.status} color={statusColor(row.status) as any} />
          <Typography variant="caption" color="text.secondary">
            Updated {formatRelative(row.updatedAt)}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (row: Row) => (
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              {row.cost != null ? formatMoney(row.cost) : '—'}
            </Typography>
            <Chip
              size="small"
              label={row.costStatus ?? 'PENDING'}
              color={costChipColor(row.costStatus) as any}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {row.costAcceptedAt ? `Accepted ${formatRelative(row.costAcceptedAt)}` : 'Awaiting confirmation'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'payments',
      label: 'Payments',
      render: (row: Row) => (
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={row.paymentStatus ?? 'UNPAID'}
              color={paymentChipColor(row.paymentStatus) as any}
            />
            <Typography variant="body2">
              Paid: {formatMoney(row.totalPaid)}
            </Typography>
          </Stack>
          {row.cost != null && (
            <Typography variant="caption" color="text.secondary">
              Outstanding: {formatMoney(row.outstanding)}
            </Typography>
          )}
          {row.lastPayment && (
            <Typography variant="caption" color="text.secondary">
              Last payment {formatRelative(row.lastPayment.receivedAt)} • {row.lastPayment.method || 'N/A'}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'store',
      label: 'Store',
      render: (row: Row) => row.storeLabel,
    },
    {
      key: 'party',
      label: 'Customer / Reseller',
      render: (row: Row) => row.partyLabel,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row: Row) => formatDate(row.createdAt),
    },
    {
      key: 'deliveryAddress',
      label: 'Delivery Address',
      render: (row: Row) => row.deliveryAddress || '—',
    },
  ], []);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          My Fulfillments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track deliveries assigned to you, their agreed costs, and recorded payments.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (click to retry)
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 0, borderRadius: 3 }}>
        <TableList
          columns={columns as any}
          rows={rows}
          loading={loading && !rows.length}
          emptyMessage="No fulfillments assigned yet."
          getRowKey={(row: any) => row.id}
          showFilters={false}
        />
      </Paper>
    </Stack>
  );
}
