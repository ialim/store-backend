import React from 'react';
import {
  usePurchaseOrdersQuery,
  usePurchaseOrdersByStatusLazyQuery,
  usePurchaseOrdersByPhaseLazyQuery,
  usePurchaseOrdersCountQuery,
  usePurchaseOrdersSearchLazyQuery,
  usePurchaseOrdersSearchCountLazyQuery,
  useUpdatePoStatusMutation,
  PurchaseOrderStatus,
  PurchasePhase,
} from '../generated/graphql';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

type Mode = 'all' | 'status' | 'phase' | 'search';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [take, setTake] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<PurchaseOrderStatus | ''>('');
  const [phase, setPhase] = React.useState<PurchasePhase | ''>('');
  const [query, setQuery] = React.useState('');
  const skip = Math.max(0, (page - 1) * take);

  const { data: baseData, loading: baseLoading, error: baseError, refetch: refetchBase } = usePurchaseOrdersQuery({
    variables: { take, skip },
    fetchPolicy: 'cache-and-network' as any,
  });
  const [loadByStatus, statusResult] = usePurchaseOrdersByStatusLazyQuery();
  const [loadByPhase, phaseResult] = usePurchaseOrdersByPhaseLazyQuery();
  const { data: countData, refetch: refetchCount } = usePurchaseOrdersCountQuery({
    variables: { status: status || undefined, phase: phase || undefined },
    fetchPolicy: 'cache-and-network' as any,
  });
  const [loadSearch, searchResult] = usePurchaseOrdersSearchLazyQuery();
  const [loadSearchCount, searchCountResult] = usePurchaseOrdersSearchCountLazyQuery();
  const [updateStatus] = useUpdatePoStatusMutation();
  const [mode, setMode] = React.useState<Mode>('all');

  const list = React.useMemo(() => {
    switch (mode) {
      case 'search':
        return searchResult.data?.purchaseOrdersSearch ?? [];
      case 'status':
        return statusResult.data?.purchaseOrdersByStatus ?? [];
      case 'phase':
        return phaseResult.data?.purchaseOrdersByPhase ?? [];
      default:
        return baseData?.purchaseOrders ?? [];
    }
  }, [mode, baseData, phaseResult.data, searchResult.data, statusResult.data]);

  const total = mode === 'search'
    ? searchCountResult.data?.purchaseOrdersSearchCount ?? 0
    : countData?.purchaseOrdersCount ?? 0;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;
  const canPrev = page > 1;
  const canNext = skip + list.length < total;

  const loadingAny = mode === 'search'
    ? searchResult.loading
    : mode === 'status'
      ? statusResult.loading
      : mode === 'phase'
        ? phaseResult.loading
        : baseLoading;

  const activeError = searchResult.error || statusResult.error || phaseResult.error || baseError;

  const fetchForMode = React.useCallback(
    async (nextMode: Mode, opts?: { page?: number; take?: number; search?: string }) => {
      const nextTake = opts?.take ?? take;
      const nextPage = opts?.page ?? 1;
      const nextSkip = Math.max(0, (nextPage - 1) * nextTake);

      if (nextMode === 'status' && status) {
        const nextStatus = status as PurchaseOrderStatus;
        setMode('status');
        await Promise.all([
          loadByStatus({ variables: { status: nextStatus, take: nextTake, skip: nextSkip } }),
          refetchCount({ status: nextStatus, phase: undefined }),
        ]);
        return;
      }

      if (nextMode === 'phase' && phase) {
        const nextPhase = phase as PurchasePhase;
        setMode('phase');
        await Promise.all([
          loadByPhase({ variables: { phase: nextPhase, take: nextTake, skip: nextSkip } }),
          refetchCount({ status: undefined, phase: nextPhase }),
        ]);
        return;
      }

      if (nextMode === 'search') {
        const searchTerm = (opts?.search ?? query).trim();
        if (searchTerm.length >= 2) {
          setMode('search');
          await Promise.all([
            loadSearch({ variables: { q: searchTerm, take: nextTake, skip: nextSkip } }),
            loadSearchCount({ variables: { q: searchTerm } }),
          ]);
          return;
        }
      }

      setMode('all');
      await Promise.all([
        refetchBase({ take: nextTake, skip: nextSkip }),
        refetchCount({ status: undefined, phase: undefined }),
      ]);
    },
    [loadByPhase, loadByStatus, loadSearch, loadSearchCount, phase, query, refetchBase, refetchCount, status, take],
  );

  const debouncedQuery = query.trim();
  React.useEffect(() => {
    if (status || phase) return;
    if (!debouncedQuery.length) {
      if (mode === 'search') {
        setPage(1);
        void fetchForMode('all', { page: 1 });
      }
      return;
    }
    const handle = window.setTimeout(() => {
      if (debouncedQuery.length >= 2) {
        setPage(1);
        void fetchForMode('search', { page: 1, search: debouncedQuery });
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [debouncedQuery, fetchForMode, mode, phase, status]);

  const handleFilter = React.useCallback(async () => {
    const nextMode: Mode = status ? 'status' : phase ? 'phase' : 'all';
    setPage(1);
    await fetchForMode(nextMode, { page: 1 });
  }, [fetchForMode, phase, status]);

  const handleClear = React.useCallback(async () => {
    setStatus('');
    setPhase('');
    setQuery('');
    setPage(1);
    await fetchForMode('all', { page: 1 });
  }, [fetchForMode]);

  const handleChangeTake = React.useCallback(
    async (value: number) => {
      const nextTake = Math.max(1, value || take);
      setTake(nextTake);
      setPage(1);
      await fetchForMode(mode, { page: 1, take: nextTake, search: debouncedQuery });
    },
    [debouncedQuery, fetchForMode, mode, take],
  );

  const handlePrev = React.useCallback(async () => {
    if (!canPrev || loadingAny) return;
    const nextPage = Math.max(1, page - 1);
    setPage(nextPage);
    await fetchForMode(mode, { page: nextPage, take, search: debouncedQuery });
  }, [canPrev, debouncedQuery, fetchForMode, loadingAny, mode, page, take]);

  const handleNext = React.useCallback(async () => {
    if (!canNext || loadingAny) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchForMode(mode, { page: nextPage, take, search: debouncedQuery });
  }, [canNext, debouncedQuery, fetchForMode, loadingAny, mode, page, take]);

  const exportCsv = React.useCallback(
    (rowsToUse?: any[]) => {
      const rows = rowsToUse && rowsToUse.length ? rowsToUse : list;
      if (!rows.length) return;
      const payload = rows.map((po: any) => [
        po.id,
        po.invoiceNumber || '',
        po.supplier?.name || po.supplier?.id || '',
        po.status || '',
        po.phase || '',
        po.createdAt ? new Date(po.createdAt).toISOString() : '',
      ]);
      const header = ['id', 'invoiceNumber', 'supplier', 'status', 'phase', 'createdAt'];
      const csv = [header, ...payload]
        .map((r) => r.map((v) => JSON.stringify(v ?? '')).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const label = `${mode}-${Math.max(0, (page - 1) * take)}-${Math.max(0, (page - 1) * take) + rows.length}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-orders-${label}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [list, mode, page, take],
  );

  const filtersRow = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
      flexWrap="wrap"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="filter-status">Status</InputLabel>
        <Select
          labelId="filter-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {[PurchaseOrderStatus.Pending, PurchaseOrderStatus.Received, PurchaseOrderStatus.PartiallyPaid, PurchaseOrderStatus.Paid, PurchaseOrderStatus.Cancelled].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="filter-phase">Phase</InputLabel>
        <Select
          labelId="filter-phase"
          label="Phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value as PurchasePhase | '')}
        >
          <MenuItem value="">
            <em>All phases</em>
          </MenuItem>
          {[PurchasePhase.Requisition, PurchasePhase.Rfq, PurchasePhase.Negotiation, PurchasePhase.Approval, PurchasePhase.Ordered, PurchasePhase.Receiving, PurchasePhase.Invoicing, PurchasePhase.Completed].map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button size="small" variant="contained" onClick={handleFilter}>
        Apply Filters
      </Button>
      <Button size="small" variant="text" onClick={handleClear}>
        Clear
      </Button>
    </Stack>
  );

  const paginationRow = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
    >
      <Typography variant="body2" color="text.secondary">
        {total ? `Showing ${rangeStart}-${rangeEnd} of ${total} orders` : 'No purchase orders found'}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant="outlined" onClick={handlePrev} disabled={!canPrev || loadingAny}>
          Prev
        </Button>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Page {page}
        </Typography>
        <Button size="small" variant="outlined" onClick={handleNext} disabled={!canNext || loadingAny}>
          Next
        </Button>
      </Stack>
    </Stack>
  );

  const trailingControls = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
      <Select
        size="small"
        value={take}
        onChange={(event) => void handleChangeTake(Number(event.target.value) || take)}
        sx={{ minWidth: 140, borderRadius: 999 }}
      >
        {[10, 25, 50, 100].map((option) => (
          <MenuItem key={option} value={option}>
            Show {option}
          </MenuItem>
        ))}
      </Select>
      <Button size="small" variant="outlined" onClick={() => exportCsv()}>
        Export CSV
      </Button>
    </Stack>
  );

  const columns = React.useMemo(
    () => [
      { key: 'id', label: 'ID' },
      {
        key: 'invoiceNumber',
        label: 'Invoice #',
        render: (po: any) => po.invoiceNumber || '—',
        sort: true,
        filter: true,
      },
      {
        key: 'supplier',
        label: 'Supplier',
        render: (po: any) => po.supplier?.name || po.supplier?.id || '—',
        sort: true,
        accessor: (po: any) => po.supplier?.name || '',
        filter: true,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (po: any) => (po.createdAt ? new Date(po.createdAt).toLocaleString() : '—'),
        sort: true,
        accessor: (po: any) => new Date(po.createdAt || 0),
      },
      {
        key: 'status',
        label: 'Status',
        render: (po: any) => (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id={`status-${po.id}`}>Status</InputLabel>
            <Select
              labelId={`status-${po.id}`}
              label="Status"
              value={po.status as PurchaseOrderStatus}
              onChange={async (e) => {
                const nextStatus = e.target.value as PurchaseOrderStatus;
                try {
                  await updateStatus({ variables: { input: { id: po.id, status: nextStatus } } });
                  await fetchForMode(mode, { page, take, search: debouncedQuery });
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              {[PurchaseOrderStatus.Pending, PurchaseOrderStatus.Received, PurchaseOrderStatus.PartiallyPaid, PurchaseOrderStatus.Paid, PurchaseOrderStatus.Cancelled].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      },
      {
        key: 'phase',
        label: 'Phase',
        render: (po: any) =>
          po.phase ? (
            <Chip
              size="small"
              label={po.phase}
              color={
                po.phase === PurchasePhase.Receiving
                  ? 'info'
                  : po.phase === PurchasePhase.Invoicing || po.phase === PurchasePhase.Completed
                    ? 'success'
                    : 'default'
              }
              variant="outlined"
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (po: any) => (
          <Button component={Link} to={`/purchase-orders/${po.id}`} size="small">
            View
          </Button>
        ),
      },
    ],
    [debouncedQuery, fetchForMode, mode, page, take, updateStatus],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Purchase Orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track purchasing workflow, manage approval states, and keep supplier orders up to date.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search by invoice number, supplier, or PO ID',
          onSubmit: () => {
            setPage(1);
            void fetchForMode('search', { page: 1, search: query.trim() });
          },
        }}
        trailing={trailingControls}
        density="compact"
      />

      <ListingHero density="compact">
        <Stack spacing={1.25}>
          {filtersRow}
          {paginationRow}
        </Stack>
      </ListingHero>

      {activeError && (
        <Alert severity="error" onClick={() => void fetchForMode(mode, { page, take, search: debouncedQuery })} sx={{ cursor: 'pointer' }}>
          {activeError.message}
        </Alert>
      )}

      <TableList
        columns={columns as any}
        rows={list}
        loading={loadingAny}
        emptyMessage="No purchase orders"
        getRowKey={(po: any) => po.id}
        onRowClick={(po: any) => navigate(`/purchase-orders/${po.id}`)}
        defaultSortKey="createdAt"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search id/invoice/supplier"
        globalSearchKeys={['id', 'invoiceNumber', 'supplier']}
        enableUrlState
        urlKey="pos"
        paginated={false}
        onExport={({ sorted }) => exportCsv(sorted as any[])}
        exportScopeControl
      />
    </Stack>
  );
}
