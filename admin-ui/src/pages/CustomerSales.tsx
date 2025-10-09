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
import { ConsumerSales } from '../operations/orders';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import { formatMoney } from '../shared/format';

type ConsumerSaleRow = {
  id: string;
  saleOrderId: string;
  customerId: string;
  storeId: string;
  billerId: string;
  status: string;
  channel: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

type ConsumerSalesData = {
  consumerSales: ConsumerSaleRow[];
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

export default function CustomerSales() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const { data, loading, error, refetch } = useQuery<ConsumerSalesData>(
    ConsumerSales,
    { fetchPolicy: 'cache-and-network' },
  );

  const sales = data?.consumerSales ?? [];
  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!term) return sales;
    return sales.filter((sale) => {
      const haystack = [
        sale.id,
        sale.saleOrderId,
        sale.customerId,
        sale.storeId,
        sale.billerId,
        sale.status,
        sale.channel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [sales, term]);

  const summary = React.useMemo(() => {
    if (!sales.length) return 'No customer sales yet';
    if (term) {
      return `Showing ${filtered.length} of ${sales.length} customer sales`;
    }
    return `${sales.length} customer sale${sales.length === 1 ? '' : 's'} recorded`;
  }, [filtered.length, sales.length, term]);

  const columns = React.useMemo(
    () => [
      {
        key: 'id',
        label: 'Sale ID',
        render: (sale: ConsumerSaleRow) => sale.id,
        accessor: (sale: ConsumerSaleRow) => sale.id,
        sort: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (sale: ConsumerSaleRow) => (
          <Chip
            size="small"
            label={sale.status}
            color={statusColor(sale.status) as any}
          />
        ),
        accessor: (sale: ConsumerSaleRow) => sale.status,
        sort: true,
      },
      {
        key: 'store',
        label: 'Store',
        render: (sale: ConsumerSaleRow) => sale.storeId,
        accessor: (sale: ConsumerSaleRow) => sale.storeId,
        sort: true,
      },
      {
        key: 'customer',
        label: 'Customer',
        render: (sale: ConsumerSaleRow) => sale.customerId || '—',
      },
      {
        key: 'total',
        label: 'Total (₦)',
        render: (sale: ConsumerSaleRow) => formatMoney(sale.totalAmount),
        accessor: (sale: ConsumerSaleRow) => sale.totalAmount,
        sort: true,
        align: 'right' as const,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (sale: ConsumerSaleRow) => formatDate(sale.createdAt),
        accessor: (sale: ConsumerSaleRow) => new Date(sale.createdAt || 0).getTime(),
        sort: true,
      },
      {
        key: 'order',
        label: 'Order',
        render: (sale: ConsumerSaleRow) => sale.saleOrderId || '—',
      },
    ],
    [],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Customer Sales
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review consumer-facing sales converted from quotations and linked to orders.
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search sales by ID, customer, store, or status',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
      </ListingHero>

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (tap to retry)
        </Alert>
      )}

      <TableList
        columns={columns as any}
        rows={filtered}
        loading={loading && !sales.length}
        emptyMessage="No customer sales to display."
        getRowKey={(sale: ConsumerSaleRow) => sale.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        actions={{
          view: {
            label: 'View sale detail',
            onClick: (sale: ConsumerSaleRow) =>
              navigate(`/orders/sales/consumer/${sale.id}`),
          },
          edit: {
            label: 'Open related order',
            hidden: (sale: ConsumerSaleRow) => !sale.saleOrderId,
            onClick: (sale: ConsumerSaleRow) => {
              if (sale.saleOrderId) {
                navigate(`/orders/${sale.saleOrderId}`);
              }
            },
          },
        }}
        onRowClick={(sale: ConsumerSaleRow) =>
          navigate(`/orders/sales/consumer/${sale.id}`)
        }
      />

      {!sales.length && !loading && (
        <Stack spacing={1} alignItems="center" py={4}>
          <Typography color="text.secondary">
            No customer sales recorded yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            startIcon={<LocalMallIcon fontSize="small" />}
          >
            Refresh
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
