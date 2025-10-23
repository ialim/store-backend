import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import { formatMoney } from '../shared/format';
import { Orders, OrderBillers } from '../operations/orders';
import { Stores } from '../operations/stores';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS } from '../shared/permissions';
import { Screen, NavBar, Card, Button, Tag, ListItem } from '@store/ui-web';
import { spacing } from '@store/design-tokens';

type FulfillmentSummary = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  storeId: string;
  billerId: string;
  type: string;
  status: string;
  phase: string;
  saleWorkflowState?: string | null;
  saleWorkflowSummary?: {
    saleOrderId: string;
    outstanding: number;
    canAdvanceByPayment: boolean;
    canAdvanceByCredit: boolean;
  } | null;
  fulfillmentWorkflowState?: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  resellerSaleid?: string | null;
  quotation?: {
    id: string;
    status: string;
    type: string;
    billerId?: string | null;
    resellerId?: string | null;
    totalAmount: number;
    updatedAt: string;
  } | null;
  fulfillment?: FulfillmentSummary | null;
  biller?: {
    id: string;
    email: string;
    customerProfile?: { fullName?: string | null } | null;
  } | null;
};

type OrdersQueryData = {
  ordersQuery: OrderRow[];
};

type StoreInfo = {
  id: string;
  name: string;
  location?: string | null;
};

type StoreListData = {
  listStores: StoreInfo[];
};

type BillerInfo = {
  id: string;
  email: string;
  customerProfile?: { fullName?: string | null } | null;
};

type ListBillersData = {
  orderBillers: BillerInfo[];
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

type TagStyle = {
  variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  tone?: 'solid' | 'subtle';
};

function statusTagProps(status?: string): TagStyle {
  switch ((status || '').toUpperCase()) {
    case 'CANCELLED':
    case 'REJECTED':
      return { variant: 'danger', tone: 'subtle' };
    case 'FULFILLED':
    case 'COMPLETED':
    case 'APPROVED':
      return { variant: 'success', tone: 'subtle' };
    case 'PENDING':
    case 'DRAFT':
      return { variant: 'warning', tone: 'subtle' };
    default:
      return { variant: 'neutral', tone: 'subtle' };
  }
}

function formatStoreLabel(
  store?: StoreInfo | null,
  fallback?: string | null,
): string {
  if (!store) return fallback ?? '—';
  const location = store.location?.trim();
  return location?.length ? `${store.name} • ${location}` : store.name;
}

function formatBillerLabel(
  biller?: BillerInfo | null,
  fallback?: string | null,
): string {
  const fullName = biller?.customerProfile?.fullName?.trim();
  if (fullName) return fullName;
  const email = biller?.email?.trim();
  if (email) return email;
  return fallback ?? '—';
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const { data, loading, error, refetch } = useQuery<OrdersQueryData>(Orders, {
    fetchPolicy: 'cache-and-network',
  });
  const { hasPermission } = useAuth();
  const canLoadStores = hasPermission(PERMISSIONS.store.READ as string);
  const canLoadBillers = hasPermission(PERMISSIONS.order.READ as string);
  const { data: storesData } = useQuery<StoreListData>(Stores, {
    variables: { take: 500 },
    fetchPolicy: 'cache-first',
    skip: !canLoadStores,
  });
  const { data: billersData } = useQuery<ListBillersData>(OrderBillers, {
    fetchPolicy: 'cache-first',
    skip: !canLoadBillers,
  });

  const storeMap = React.useMemo(() => {
    const entries = storesData?.listStores?.map((store) => [
      store.id,
      formatStoreLabel(store, store.id),
    ]) as Array<[string, string]> | undefined;
    return new Map(entries ?? []);
  }, [storesData]);

  const billerMap = React.useMemo(() => {
    const entries = billersData?.orderBillers?.map((biller) => [
      biller.id,
      formatBillerLabel(biller, biller.id),
    ]) as Array<[string, string]> | undefined;
    return new Map(entries ?? []);
  }, [billersData]);

  const orders = data?.ordersQuery ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOrders = React.useMemo(() => {
    if (!normalizedSearch) return orders;
    return orders.filter((order) => {
      const text = [
        order.id,
        order.storeId,
        order.billerId,
        storeMap.get(order.storeId),
        billerMap.get(order.billerId) ?? formatBillerLabel(order.biller, order.billerId),
        order.status,
        order.phase,
        order.type,
        order.resellerSaleid,
        order.saleWorkflowState,
        order.saleWorkflowSummary?.outstanding?.toString(),
        order.fulfillmentWorkflowState,
        order.fulfillment?.status,
        order.quotation?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [orders, normalizedSearch, storeMap, billerMap]);

  const columns = React.useMemo(
    () => [
      {
        key: 'id',
        label: 'Order ID',
        render: (row: OrderRow) => row.id,
        accessor: (row: OrderRow) => row.id,
        sort: true,
      },
      {
        key: 'type',
        label: 'Type',
        render: (row: OrderRow) => row.type,
        accessor: (row: OrderRow) => row.type,
        sort: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (row: OrderRow) => (
          <Tag label={row.status} {...statusTagProps(row.status)} uppercase />
        ),
        accessor: (row: OrderRow) => row.status,
        sort: true,
      },
      {
        key: 'saleWorkflowState',
        label: 'Sale State',
        render: (row: OrderRow) =>
          row.saleWorkflowState ? (
            <Tag
              label={row.saleWorkflowState}
              {...statusTagProps(row.saleWorkflowState)}
              uppercase
            />
          ) : (
            '—'
          ),
        accessor: (row: OrderRow) => row.saleWorkflowState ?? '',
        sort: true,
      },
      {
        key: 'outstanding',
        label: 'Outstanding (₦)',
        align: 'right' as const,
        render: (row: OrderRow) =>
          row.saleWorkflowSummary
            ? formatMoney(row.saleWorkflowSummary.outstanding)
            : '—',
        accessor: (row: OrderRow) =>
          row.saleWorkflowSummary?.outstanding ?? 0,
        sort: true,
      },
      {
        key: 'quotationStatus',
        label: 'Quotation',
        render: (row: OrderRow) =>
          row.quotation?.status ? (
            <Tag
              label={row.quotation.status}
              {...statusTagProps(row.quotation.status)}
              uppercase
            />
          ) : (
            '—'
          ),
        accessor: (row: OrderRow) => row.quotation?.status || '',
        sort: true,
      },
      {
        key: 'phase',
        label: 'Phase',
        render: (row: OrderRow) => row.phase,
        accessor: (row: OrderRow) => row.phase,
        sort: true,
      },
      {
        key: 'total',
        label: 'Total (₦)',
        render: (row: OrderRow) => formatMoney(row.totalAmount),
        accessor: (row: OrderRow) => row.totalAmount,
        sort: true,
        align: 'right' as const,
      },
      {
        key: 'store',
        label: 'Store',
        render: (row: OrderRow) =>
          storeMap.get(row.storeId) ?? formatStoreLabel(null, row.storeId),
        accessor: (row: OrderRow) =>
          storeMap.get(row.storeId) ?? formatStoreLabel(null, row.storeId),
        sort: true,
      },
      {
        key: 'biller',
        label: 'Biller',
        render: (row: OrderRow) =>
          billerMap.get(row.billerId) ?? formatBillerLabel(row.biller, row.billerId),
      },
      {
        key: 'fulfillment',
        label: 'Fulfillment',
        render: (row: OrderRow) =>
          row.fulfillmentWorkflowState ? (
            <Tag
              label={row.fulfillmentWorkflowState}
              {...statusTagProps(row.fulfillmentWorkflowState)}
              uppercase
            />
          ) : row.fulfillment ? (
            <Tag
              label={row.fulfillment.status}
              {...statusTagProps(row.fulfillment.status)}
              uppercase
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (row: OrderRow) => formatDate(row.createdAt),
        accessor: (row: OrderRow) => new Date(row.createdAt || 0).getTime(),
        sort: true,
      },
    ],
    [storeMap, billerMap]
  );

  const summary = React.useMemo(() => {
    if (!orders.length) return 'No orders yet';
    if (normalizedSearch) {
      return `Showing ${filteredOrders.length} of ${orders.length} orders`;
    }
    return `${orders.length} order${orders.length === 1 ? '' : 's'} available`;
  }, [filteredOrders.length, normalizedSearch, orders.length]);

  const handleCreateQuotation = () => navigate('/orders/quotations/new');

  return (
    <Screen padded>
      <Stack spacing={4}>
        <NavBar
          title="Orders"
          subtitle={summary}
          rightSlot={<Button label="Add quotation" onClick={handleCreateQuotation} />}
          showDivider
        />

        <Card padding="xl">
          <ListingHero
            density="compact"
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search orders by ID, status, store, or biller',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Review all orders across stores, track fulfillment progress, and stay on top of outstanding actions.
            </Typography>
          </ListingHero>
        </Card>

        {error && (
          <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
            {error.message} (tap to retry)
          </Alert>
        )}

        <Card padding="xl">
          <TableList
            columns={columns as any}
            rows={filteredOrders}
            loading={loading && !orders.length}
            emptyMessage="No orders to display."
            getRowKey={(row: OrderRow) => row.id}
            defaultSortKey="createdAt"
            defaultSortDir="desc"
            rowsPerPageOptions={[10, 25, 50, 100]}
            defaultRowsPerPage={25}
            actions={{
              view: {
                label: 'View details',
                onClick: (row: OrderRow) => navigate(`/orders/${row.id}`),
              },
            }}
            onRowClick={(row: OrderRow) => navigate(`/orders/${row.id}`)}
          />
        </Card>

        {!orders.length && !loading && (
          <Card padding="xl">
            <Stack spacing={2} alignItems="center">
              <Typography color="text.secondary">
                There are no orders yet. Orders will appear here once they are created.
              </Typography>
              <Button label="Refresh" variant="secondary" onClick={() => refetch()} />
              <ListItem
                title="Create your first quotation"
                description="Kick off the order workflow by raising a quotation for a reseller or customer."
                trailing={<Tag label="Tip" variant="info" tone="subtle" uppercase />}
                onClick={handleCreateQuotation}
                sx={{ width: '100%' }}
              />
            </Stack>
          </Card>
        )}
      </Stack>
    </Screen>
  );
}
