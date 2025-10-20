import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Chip,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import { ConsumerSales, ResellerSales } from '../operations/orders';
import { Stores } from '../operations/stores';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import { useAuth } from '../shared/AuthProvider';
import { formatMoney } from '../shared/format';

type StoreInfo = {
  id: string;
  name: string;
  location?: string | null;
} | null;

type ConsumerSaleRow = {
  id: string;
  saleOrderId: string;
  customerId?: string | null;
  storeId?: string | null;
  billerId?: string | null;
  status: string;
  channel: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  store?: StoreInfo;
  customer?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    customerProfile?: { fullName?: string | null } | null;
  } | null;
  biller?: {
    id: string;
    email?: string | null;
    customerProfile?: { fullName?: string | null } | null;
  } | null;
};

type ResellerInfo = {
  id: string;
  email?: string | null;
  customerProfile?: { fullName?: string | null } | null;
} | null;

type ResellerSaleRow = {
  id: string;
  SaleOrderid: string;
  resellerId: string;
  billerId: string;
  storeId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  store?: StoreInfo;
  reseller?: ResellerInfo;
  biller?: ResellerInfo;
};

type SalesRow = {
  id: string;
  saleOrderId: string;
  storeId?: string | null;
  storeLabel: string;
  billerId?: string | null;
  billerLabel?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  partyId?: string | null;
  partyLabel?: string;
  channel?: string | null;
  kind: 'CONSUMER' | 'RESELLER';
};

type ConsumerSalesData = {
  consumerSales: ConsumerSaleRow[];
};

type ResellerSalesData = {
  resellerSales: ResellerSaleRow[];
};

type StoreListData = {
  listStores: Array<{
    id: string;
    name: string;
    location?: string | null;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'FULFILLED':
    case 'COMPLETED':
    case 'PAID':
      return 'success';
    case 'CANCELLED':
    case 'REJECTED':
      return 'error';
    case 'PENDING':
    case 'PROCESSING':
      return 'warning';
    default:
      return 'default';
  }
}

function formatStoreLabel(store: StoreInfo, fallback?: string | null) {
  if (!store) return fallback ?? '—';
  const location = store.location?.trim();
  return location?.length ? `${store.name} • ${location}` : store.name;
}

function formatUserLabel(
  user?:
    | {
        fullName?: string | null;
        email?: string | null;
        customerProfile?: { fullName?: string | null } | null;
      }
    | null,
  fallback?: string | null,
) {
  const profileName = user?.customerProfile?.fullName?.trim();
  if (profileName) return profileName;
  const directName = user?.fullName?.trim();
  if (directName) return directName;
  const email = user?.email?.trim();
  if (email) return email;
  return fallback ?? '—';
}

export default function OrdersSales() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const auth = useAuth();
  const isReseller = auth.hasRole('RESELLER');

  const consumerResult = useQuery<ConsumerSalesData>(ConsumerSales, {
    fetchPolicy: 'cache-and-network',
    skip: isReseller,
  });
  const resellerResult = useQuery<ResellerSalesData>(ResellerSales, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: storesData } = useQuery<StoreListData>(Stores, {
    variables: { take: 500 },
    fetchPolicy: 'cache-first',
    skip: isReseller,
  });

  const storeMap = React.useMemo(() => {
    const entries = storesData?.listStores?.map((store) => [
      store.id,
      formatStoreLabel(store as StoreInfo, store.name),
    ]) as Array<[string, string]> | undefined;
    return new Map(entries ?? []);
  }, [storesData]);

  const consumerLoading = !isReseller && consumerResult.loading;
  const consumerError = !isReseller ? consumerResult.error : undefined;
  const loading = consumerLoading || resellerResult.loading;
  const error = consumerError || resellerResult.error;
  const sales: SalesRow[] = React.useMemo(() => {
    const consumerRows =
      (isReseller ? [] : consumerResult.data?.consumerSales)?.map((sale) => {
        const storeLabel =
          (sale.storeId && storeMap.get(sale.storeId)) ??
          formatStoreLabel(sale.store ?? null, sale.storeId ?? undefined);
        const partyLabel = formatUserLabel(
          sale.customer,
          sale.customerId ?? undefined,
        );
        const billerLabel = formatUserLabel(
          sale.biller,
          sale.billerId ?? undefined,
        );
        return {
          id: sale.id,
          saleOrderId: sale.saleOrderId,
          storeId: sale.storeId ?? null,
          storeLabel,
          billerId: sale.billerId,
          status: sale.status,
          totalAmount: sale.totalAmount,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          partyId: sale.customerId ?? null,
          partyLabel,
          channel: sale.channel,
          billerLabel,
          kind: 'CONSUMER' as const,
        };
      }) ?? [];

    const resellerRows =
      resellerResult.data?.resellerSales.map((sale) => {
        const storeLabel =
          storeMap.get(sale.storeId) ??
          formatStoreLabel(sale.store ?? null, sale.storeId);
        const partyLabel = formatUserLabel(
          sale.reseller,
          sale.resellerId ?? undefined,
        );
        const billerLabel = formatUserLabel(
          sale.biller,
          sale.billerId ?? undefined,
        );
        return {
          id: sale.id,
          saleOrderId: sale.SaleOrderid,
          storeId: sale.storeId,
          storeLabel,
          billerId: sale.billerId,
          status: sale.status,
          totalAmount: sale.totalAmount,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt,
          partyId: sale.resellerId,
          partyLabel,
          channel: 'RESELLER',
          billerLabel,
          kind: 'RESELLER' as const,
        };
      }) ?? [];

    return [...consumerRows, ...resellerRows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [consumerResult.data?.consumerSales, resellerResult.data?.resellerSales, storeMap, isReseller]);

  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!term) return sales;
    return sales.filter((sale) => {
      const haystack = [
        sale.id,
        sale.saleOrderId,
        sale.storeId,
        sale.storeLabel,
        sale.billerId,
        sale.status,
        sale.kind,
        sale.partyId,
        sale.partyLabel,
        sale.channel,
        sale.billerLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [sales, term]);

  const summary = React.useMemo(() => {
    if (!sales.length) return 'No sales yet';
    if (term) {
      return `Showing ${filtered.length} of ${sales.length} sales`;
    }
    return `${sales.length} sale${sales.length === 1 ? '' : 's'} recorded`;
  }, [filtered.length, sales.length, term]);

  const columns = React.useMemo(
    () => [
      {
        key: 'id',
        label: 'Sale ID',
        render: (sale: SalesRow) => sale.id,
        accessor: (sale: SalesRow) => sale.id,
        sort: true,
      },
      {
        key: 'type',
        label: 'Type',
        render: (sale: SalesRow) => sale.kind,
        accessor: (sale: SalesRow) => sale.kind,
        sort: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (sale: SalesRow) => (
          <Chip
            size="small"
            label={sale.status}
            color={statusColor(sale.status) as any}
          />
        ),
        accessor: (sale: SalesRow) => sale.status,
        sort: true,
      },
      {
        key: 'store',
        label: 'Store',
        render: (sale: SalesRow) => sale.storeLabel,
        accessor: (sale: SalesRow) => sale.storeLabel,
        sort: true,
      },
      {
        key: 'party',
        label: 'Customer / Reseller',
        render: (sale: SalesRow) => sale.partyLabel || sale.partyId || '—',
      },
      {
        key: 'total',
        label: 'Total (₦)',
        render: (sale: SalesRow) => formatMoney(sale.totalAmount),
        accessor: (sale: SalesRow) => sale.totalAmount,
        sort: true,
        align: 'right' as const,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (sale: SalesRow) => formatDate(sale.createdAt),
        accessor: (sale: SalesRow) => new Date(sale.createdAt || 0).getTime(),
        sort: true,
      },
      {
        key: 'order',
        label: 'Order',
        render: (sale: SalesRow) => sale.saleOrderId || '—',
      },
    ],
    []
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Sales
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor consumer and reseller sales linked to orders and confirm downstream actions.
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search sales by ID, store, customer, status, or biller',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
      </ListingHero>

      {error && (
        <Alert
          severity="error"
          onClick={() => {
            if (!isReseller) consumerResult.refetch();
            resellerResult.refetch();
          }}
          sx={{ cursor: 'pointer' }}
        >
          {error.message} (tap to retry)
        </Alert>
      )}

      <TableList
        columns={columns as any}
        rows={filtered}
        loading={loading && !sales.length}
        emptyMessage="No sales to display."
        getRowKey={(sale: SalesRow) => sale.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        actions={{
          view: {
            label: 'View details',
            onClick: (sale: SalesRow) =>
              navigate(`/orders/sales/${sale.kind.toLowerCase()}/${sale.id}`),
          },
          edit: {
            label: 'Open related order',
            hidden: (sale: SalesRow) => !sale.saleOrderId,
            onClick: (sale: SalesRow) => {
              if (sale.saleOrderId) {
                navigate(`/orders/${sale.saleOrderId}`);
              }
            },
          },
        }}
        onRowClick={(sale: SalesRow) =>
          navigate(`/orders/sales/${sale.kind.toLowerCase()}/${sale.id}`)
        }
      />

      {!sales.length && !loading && (
        <Stack spacing={1} alignItems="center" py={4}>
          <Typography color="text.secondary">
            No sales recorded yet. Sales created in quotation workflows will appear here.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              if (!isReseller) consumerResult.refetch();
              resellerResult.refetch();
            }}
            startIcon={<LocalMallIcon fontSize="small" />}
          >
            Refresh
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
