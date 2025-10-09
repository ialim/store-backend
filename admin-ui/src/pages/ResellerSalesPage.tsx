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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { ResellerSales } from '../operations/orders';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import { formatMoney } from '../shared/format';

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
};

type ResellerSalesData = {
  resellerSales: ResellerSaleRow[];
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

export default function ResellerSalesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const { data, loading, error, refetch } = useQuery<ResellerSalesData>(
    ResellerSales,
    { fetchPolicy: 'cache-and-network' },
  );

  const sales = data?.resellerSales ?? [];
  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!term) return sales;
    return sales.filter((sale) => {
      const haystack = [
        sale.id,
        sale.SaleOrderid,
        sale.resellerId,
        sale.storeId,
        sale.billerId,
        sale.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [sales, term]);

  const summary = React.useMemo(() => {
    if (!sales.length) return 'No reseller sales yet';
    if (term) {
      return `Showing ${filtered.length} of ${sales.length} reseller sales`;
    }
    return `${sales.length} reseller sale${sales.length === 1 ? '' : 's'} recorded`;
  }, [filtered.length, sales.length, term]);

  const columns = React.useMemo(
    () => [
      {
        key: 'id',
        label: 'Sale ID',
        render: (sale: ResellerSaleRow) => sale.id,
        accessor: (sale: ResellerSaleRow) => sale.id,
        sort: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (sale: ResellerSaleRow) => (
          <Chip
            size="small"
            label={sale.status}
            color={statusColor(sale.status) as any}
          />
        ),
        accessor: (sale: ResellerSaleRow) => sale.status,
        sort: true,
      },
      {
        key: 'store',
        label: 'Store',
        render: (sale: ResellerSaleRow) => sale.storeId,
        accessor: (sale: ResellerSaleRow) => sale.storeId,
        sort: true,
      },
      {
        key: 'reseller',
        label: 'Reseller',
        render: (sale: ResellerSaleRow) => sale.resellerId,
      },
      {
        key: 'total',
        label: 'Total (₦)',
        render: (sale: ResellerSaleRow) => formatMoney(sale.totalAmount),
        accessor: (sale: ResellerSaleRow) => sale.totalAmount,
        sort: true,
        align: 'right' as const,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (sale: ResellerSaleRow) => formatDate(sale.createdAt),
        accessor: (sale: ResellerSaleRow) => new Date(sale.createdAt || 0).getTime(),
        sort: true,
      },
      {
        key: 'order',
        label: 'Order',
        render: (sale: ResellerSaleRow) => sale.SaleOrderid || '—',
      },
    ],
    [],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Reseller Sales
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor reseller sales linked to orders and verify billing status.
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search sales by ID, reseller, store, or status',
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
        emptyMessage="No reseller sales to display."
        getRowKey={(sale: ResellerSaleRow) => sale.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        actions={{
          view: {
            label: 'View sale detail',
            onClick: (sale: ResellerSaleRow) =>
              navigate(`/orders/sales/reseller/${sale.id}`),
          },
          edit: {
            label: 'Open related order',
            hidden: (sale: ResellerSaleRow) => !sale.SaleOrderid,
            onClick: (sale: ResellerSaleRow) => {
              if (sale.SaleOrderid) {
                navigate(`/orders/${sale.SaleOrderid}`);
              }
            },
          },
        }}
        onRowClick={(sale: ResellerSaleRow) =>
          navigate(`/orders/sales/reseller/${sale.id}`)
        }
      />

      {!sales.length && !loading && (
        <Stack spacing={1} alignItems="center" py={4}>
          <Typography color="text.secondary">
            No reseller sales recorded yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            startIcon={<ReceiptLongIcon fontSize="small" />}
          >
            Refresh
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
