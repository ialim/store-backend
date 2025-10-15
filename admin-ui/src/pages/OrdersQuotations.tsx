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
import DescriptionIcon from '@mui/icons-material/Description';
import { Quotations } from '../operations/orders';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import { formatMoney } from '../shared/format';

type QuotationRow = {
  id: string;
  storeId: string;
  billerId?: string | null;
  consumerId?: string | null;
  resellerId?: string | null;
  status: string;
  type: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  saleOrderId?: string | null;
  SaleOrder?: {
    id: string;
    status: string;
    phase: string;
  } | null;
};

type OrdersQuotationsProps = {
  type?: 'CONSUMER' | 'RESELLER';
};

type QuotationsQueryData = {
  quotations: QuotationRow[];
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
    case 'APPROVED':
    case 'CONFIRMED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    case 'DRAFT':
      return 'warning';
    default:
      return 'default';
  }
}

export default function OrdersQuotations({ type }: OrdersQuotationsProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const { data, loading, error, refetch } =
    useQuery<QuotationsQueryData>(Quotations, {
      fetchPolicy: 'cache-and-network',
    });

  const quotations = data?.quotations ?? [];
  const scoped = React.useMemo(() => {
    if (!type) return quotations;
    return quotations.filter(
      (quotation) => (quotation.type || '').toUpperCase() === type,
    );
  }, [quotations, type]);
  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!term) return scoped;
    return scoped.filter((q) => {
      const haystack = [
        q.id,
        q.storeId,
        q.billerId,
        q.consumerId,
        q.resellerId,
        q.status,
        q.type,
        q.saleOrderId,
        q.SaleOrder?.status,
        q.SaleOrder?.phase,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [scoped, term]);

  const title = React.useMemo(() => {
    if (type === 'CONSUMER') return 'Customer Quotations';
    if (type === 'RESELLER') return 'Reseller Quotations';
    return 'Quotations';
  }, [type]);

  const subtitle = React.useMemo(() => {
    if (type === 'CONSUMER') {
      return 'Track customer quotations before they become sales orders.';
    }
    if (type === 'RESELLER') {
      return 'Track reseller quotations before they become sales orders.';
    }
    return 'Track drafts and confirmed quotations before they become sales orders.';
  }, [type]);

  const summary = React.useMemo(() => {
    if (!scoped.length) {
      if (type === 'CONSUMER') return 'No customer quotations yet';
      if (type === 'RESELLER') return 'No reseller quotations yet';
      return 'No quotations yet';
    }
    if (term) {
      return `Showing ${filtered.length} of ${scoped.length} quotations`;
    }
    return `${scoped.length} quotation${scoped.length === 1 ? '' : 's'} available`;
  }, [filtered.length, scoped.length, term, type]);

  const columns = React.useMemo(
    () => [
      {
        key: 'id',
        label: 'Quotation ID',
        render: (q: QuotationRow) => q.id,
        accessor: (q: QuotationRow) => q.id,
        sort: true,
      },
      {
        key: 'type',
        label: 'Type',
        render: (q: QuotationRow) => q.type,
        sort: true,
      },
      {
        key: 'status',
        label: 'Status',
        render: (q: QuotationRow) => (
          <Chip
            size="small"
            label={q.status}
            color={statusColor(q.status) as any}
          />
        ),
        accessor: (q: QuotationRow) => q.status,
        sort: true,
      },
      {
        key: 'store',
        label: 'Store',
        render: (q: QuotationRow) => q.storeId,
        accessor: (q: QuotationRow) => q.storeId,
        sort: true,
      },
      {
        key: 'biller',
        label: 'Biller',
        render: (q: QuotationRow) => q.billerId || '—',
        sort: true,
      },
      {
        key: 'party',
        label: 'Customer / Reseller',
        render: (q: QuotationRow) =>
          q.consumerId || q.resellerId || '—',
      },
      {
        key: 'total',
        label: 'Total (₦)',
        render: (q: QuotationRow) => formatMoney(q.totalAmount),
        accessor: (q: QuotationRow) => q.totalAmount,
        sort: true,
        align: 'right' as const,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (q: QuotationRow) => formatDate(q.createdAt),
        accessor: (q: QuotationRow) => new Date(q.createdAt || 0).getTime(),
        sort: true,
      },
      {
        key: 'order',
        label: 'Order',
        render: (q: QuotationRow) => q.saleOrderId || '—',
      },
    ],
    []
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by ID, store, biller, or status',
        }}
        action={
          <Button
            variant="contained"
            color="success"
            onClick={() => navigate('/orders/quotations/new')}
            startIcon={<DescriptionIcon fontSize="small" />}
            sx={{ borderRadius: 999 }}
          >
            Add Quotation
          </Button>
        }
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
        loading={loading && !quotations.length}
        emptyMessage="No quotations to display."
        getRowKey={(row: QuotationRow) => row.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        actions={{
          view: {
            label: 'View details',
            onClick: (row: QuotationRow) => navigate(`/orders/quotations/${row.id}`),
          },
          edit: {
            label: 'Edit quotation',
            onClick: (row: QuotationRow) => navigate(`/orders/quotations/${row.id}/edit`),
          },
        }}
        onRowClick={(row: QuotationRow) => navigate(`/orders/quotations/${row.id}`)}
      />

      {!quotations.length && !loading && (
        <Stack spacing={1} alignItems="center" py={4}>
          <Typography color="text.secondary">
            There are no quotations yet. Draft a quotation from the sales flow to get started.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => refetch()}
            startIcon={<DescriptionIcon fontSize="small" />}
          >
            Refresh
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
