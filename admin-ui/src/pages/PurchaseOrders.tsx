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
import { Alert, Button, Chip, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';


export default function PurchaseOrders() {
  const [take, setTake] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const skip = Math.max(0, (page - 1) * take);
  const { data, loading, error, refetch: refetchBase } = usePurchaseOrdersQuery({ variables: { take, skip }, fetchPolicy: 'cache-and-network' as any });
  const [updateStatus] = useUpdatePoStatusMutation();
  const [status, setStatus] = React.useState<PurchaseOrderStatus | ''>('');
  const [phase, setPhase] = React.useState<PurchasePhase | ''>('');
  const [query, setQuery] = React.useState<string>('');
  const [loadByStatus, byStatus] = usePurchaseOrdersByStatusLazyQuery();
  const [loadByPhase, byPhase] = usePurchaseOrdersByPhaseLazyQuery();
  const { data: countData, refetch: refetchCount } = usePurchaseOrdersCountQuery({ variables: { status: status || undefined, phase: phase || undefined }, fetchPolicy: 'cache-and-network' as any });
  const [loadSearch, bySearch] = usePurchaseOrdersSearchLazyQuery();
  const [loadSearchCount, bySearchCount] = usePurchaseOrdersSearchCountLazyQuery();
  const [mode, setMode] = React.useState<'all'|'status'|'phase'|'search'>('all');
  const list = (bySearch.data?.purchaseOrdersSearch ?? byStatus.data?.purchaseOrdersByStatus ?? byPhase.data?.purchaseOrdersByPhase ?? data?.purchaseOrders) ?? [];
  const baseTotal = countData?.purchaseOrdersCount ?? 0;
  const searchTotal = bySearchCount.data?.purchaseOrdersSearchCount ?? 0;
  const total = mode === 'search' ? searchTotal : baseTotal;
  const canPrev = page > 1;
  const canNext = skip + list.length < total;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;
  const navigate = useNavigate();
  const exportCsv = () => {
    const rows = list.map((po: any) => [
      po.id,
      po.invoiceNumber || '',
      po.supplier?.name || po.supplier?.id || '',
      po.status || '',
      po.phase || '',
      po.createdAt ? new Date(po.createdAt).toISOString() : '',
    ]);
    const header = ['id','invoiceNumber','supplier','status','phase','createdAt'];
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((x: any) => JSON.stringify(x ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fname = `purchase-orders-${mode}-${skip}-${skip + list.length}.csv`;
    // Use native download if file-saver is not desired
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fname; a.click(); URL.revokeObjectURL(url);
  };
  // Debounced search when only query is used (no status/phase active)
  React.useEffect(() => {
    const q = query.trim();
    if (!status && !phase) {
      const h = setTimeout(async () => {
        if (q.length >= 2) {
          setMode('search');
          setPage(1);
          await loadSearch({ variables: { q, take, skip: 0 } });
          await loadSearchCount({ variables: { q } });
        } else if (mode === 'search') {
          setMode('all');
          setPage(1);
          await refetchBase({ take, skip: 0 });
          await refetchCount({ status: undefined, phase: undefined });
        }
      }, 300);
      return () => clearTimeout(h);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, phase, take]);
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Purchase Orders</Typography>
      {error && <Alert severity="error" onClick={() => refetchBase()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField size="small" label="Search (ID/Invoice/Supplier)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="filter-status">Status</InputLabel>
          <Select
            labelId="filter-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
          >
            <MenuItem value=""><em>All statuses</em></MenuItem>
            {[PurchaseOrderStatus.Pending, PurchaseOrderStatus.Received, PurchaseOrderStatus.PartiallyPaid, PurchaseOrderStatus.Paid, PurchaseOrderStatus.Cancelled].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
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
            <MenuItem value=""><em>All phases</em></MenuItem>
            {[PurchasePhase.Requisition, PurchasePhase.Rfq, PurchasePhase.Negotiation, PurchasePhase.Approval, PurchasePhase.Ordered, PurchasePhase.Receiving, PurchasePhase.Invoicing, PurchasePhase.Completed].map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={async () => {
            const trimmed = query.trim();
            if (trimmed.length >= 2) {
              setMode('search');
              await loadSearch({ variables: { q: trimmed, take, skip } });
              await loadSearchCount({ variables: { q: trimmed } });
            } else if (status) {
              setMode('status');
              await loadByStatus({ variables: { status, take, skip } });
              await refetchCount({ status, phase: undefined });
            } else if (phase) {
              setMode('phase');
              await loadByPhase({ variables: { phase, take, skip } });
              await refetchCount({ status: undefined, phase });
            } else {
              setMode('all');
              await refetchBase({ take, skip });
              await refetchCount({ status: undefined, phase: undefined });
            }
          }}
        >
          Filter
        </Button>
        {(bySearch.error || byStatus.error || byPhase.error) && (
          <Alert severity="error">{bySearch.error?.message || byStatus.error?.message || byPhase.error?.message}</Alert>
        )}
        <Button
          variant="text"
          onClick={async () => {
            setQuery('');
            setStatus('');
            setPhase('');
            setPage(1);
            setMode('all');
            await refetchBase({ take, skip: 0 });
            await refetchCount({ status: undefined, phase: undefined });
          }}
        >
          Clear
        </Button>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
          <Button size="small" onClick={exportCsv}>Export CSV</Button>
          <TextField size="small" label="Page size" type="number" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 25); setPage(1); setTake(v); }} sx={{ width: 120 }} />
          <Button
            size="small"
            disabled={!canPrev}
            onClick={async () => {
              if (!canPrev) return;
              const p = Math.max(1, page - 1);
              setPage(p);
              const newSkip = (p - 1) * take;
              if (mode === 'search') await loadSearch({ variables: { q: query.trim(), take, skip: newSkip } });
              else if (mode === 'status' && status) await loadByStatus({ variables: { status, take, skip: newSkip } });
              else if (mode === 'phase' && phase) await loadByPhase({ variables: { phase, take, skip: newSkip } });
              else await refetchBase({ take, skip: newSkip });
            }}
          >
            Prev
          </Button>
          <Typography variant="body2">Page {page}</Typography>
          <Button
            size="small"
            disabled={!canNext}
            onClick={async () => {
              if (!canNext) return;
              const p = page + 1;
              setPage(p);
              const newSkip = (p - 1) * take;
              if (mode === 'search') await loadSearch({ variables: { q: query.trim(), take, skip: newSkip } });
              else if (mode === 'status' && status) await loadByStatus({ variables: { status, take, skip: newSkip } });
              else if (mode === 'phase' && phase) await loadByPhase({ variables: { phase, take, skip: newSkip } });
              else await refetchBase({ take, skip: newSkip });
            }}
          >
            Next
          </Button>
          <Typography variant="body2" sx={{ ml: 1, minWidth: 110, textAlign: 'right' }}>{total ? `${rangeStart}–${rangeEnd} of ${total}` : '0 of 0'}</Typography>
        </Stack>
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'id', label: 'ID' },
          { key: 'invoiceNumber', label: 'Invoice #', render: (po: any) => po.invoiceNumber || '—', sort: true, filter: true },
          { key: 'supplier', label: 'Supplier', render: (po: any) => po.supplier?.name || po.supplier?.id || '—', sort: true, accessor: (po: any) => po.supplier?.name || '' , filter: true },
          { key: 'createdAt', label: 'Created', render: (po: any) => po.createdAt ? new Date(po.createdAt).toLocaleString() : '—', sort: true, accessor: (po: any) => new Date(po.createdAt || 0) },
          { key: 'status', label: 'Status', render: (po: any) => (
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
                    await refetchBase();
                  } catch {}
                }}
              >
                {[PurchaseOrderStatus.Pending, PurchaseOrderStatus.Received, PurchaseOrderStatus.PartiallyPaid, PurchaseOrderStatus.Paid, PurchaseOrderStatus.Cancelled].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) },
          { key: 'phase', label: 'Phase', render: (po: any) => po.phase ? (
            <Chip
              size="small"
              label={po.phase}
              color={po.phase === PurchasePhase.Receiving ? 'info' : po.phase === PurchasePhase.Invoicing || po.phase === PurchasePhase.Completed ? 'success' : 'default'}
              variant="outlined"
            />
          ) : '—' },
          { key: 'actions', label: 'Actions', render: (po: any) => (
            <Button component={Link} to={`/purchase-orders/${po.id}`} size="small">View</Button>
          ) },
        ] as any), [updateStatus, refetchBase])}
        rows={list}
        loading={loading}
        emptyMessage="No purchase orders"
        getRowKey={(po: any) => po.id}
        onRowClick={(po: any) => navigate(`/purchase-orders/${po.id}`)}
        defaultSortKey="createdAt"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search id/invoice/supplier"
        globalSearchKeys={['id','invoiceNumber','supplier']}
        enableUrlState
        urlKey="pos"
      />
    </Stack>
  );
}
