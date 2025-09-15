import React from 'react';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Chip, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';

const POS = gql`
  query PurchaseOrders($take: Int, $skip: Int) {
    purchaseOrders(take: $take, skip: $skip) { id invoiceNumber status phase createdAt supplier { id name } }
  }
`;
const POS_BY_STATUS = gql`
  query PurchaseOrdersByStatus($status: String!, $take: Int, $skip: Int) {
    purchaseOrdersByStatus(status: $status, take: $take, skip: $skip) { id invoiceNumber status phase createdAt supplier { id name } }
  }
`;
const POS_BY_PHASE = gql`
  query PurchaseOrdersByPhase($phase: String!, $take: Int, $skip: Int) {
    purchaseOrdersByPhase(phase: $phase, take: $take, skip: $skip) { id invoiceNumber status phase createdAt supplier { id name } }
  }
`;
const POS_SEARCH = gql`
  query PurchaseOrdersSearch($q: String!, $take: Int, $skip: Int) {
    purchaseOrdersSearch(q: $q, take: $take, skip: $skip) { id invoiceNumber status phase createdAt supplier { id name } }
  }
`;

const POS_COUNT = gql`
  query PurchaseOrdersCount($status: String, $phase: String) { purchaseOrdersCount(status: $status, phase: $phase) }
`;

const UPDATE_STATUS = gql`
  mutation UpdatePOStatus($input: UpdatePurchaseOrderStatusInput!) {
    updatePurchaseOrderStatus(input: $input) { id status phase }
  }
`;

export default function PurchaseOrders() {
  const [take, setTake] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const skip = Math.max(0, (page - 1) * take);
  const { data, loading, error, refetch } = useQuery(POS, { variables: { take, skip }, fetchPolicy: 'cache-and-network' });
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [status, setStatus] = React.useState<string>('');
  const [phase, setPhase] = React.useState<string>('');
  const [query, setQuery] = React.useState<string>('');
  const [loadByStatus, byStatus] = useLazyQuery(POS_BY_STATUS);
  const [loadByPhase, byPhase] = useLazyQuery(POS_BY_PHASE);
  const { data: countData, refetch: refetchCount } = useQuery(POS_COUNT, { variables: { status: status || null, phase: phase || null }, fetchPolicy: 'cache-and-network' });
  const [loadSearch, bySearch] = useLazyQuery(POS_SEARCH);
  const [loadSearchCount, bySearchCount] = useLazyQuery(POS_SEARCH_COUNT);
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
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Purchase Orders</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField size="small" label="Search (ID/Invoice/Supplier)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="filter-status">Status</InputLabel>
          <Select labelId="filter-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['DRAFT','APPROVED','SENT','RECEIVED','CANCELLED'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="filter-phase">Phase</InputLabel>
          <Select labelId="filter-phase" label="Phase" value={phase} onChange={(e) => setPhase(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['ORDERED','RECEIVING','RECEIVED','CLOSED'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={async () => {
          if (query.trim().length >= 2) {
            setMode('search');
            await loadSearch({ variables: { q: query.trim(), take, skip } });
            await loadSearchCount({ variables: { q: query.trim() } });
          } else if (status) {
            setMode('status');
            await loadByStatus({ variables: { status, take, skip } });
            await refetchCount({ status, phase: null });
          } else if (phase) {
            setMode('phase');
            await loadByPhase({ variables: { phase, take, skip } });
            await refetchCount({ status: null, phase });
          } else {
            setMode('all');
            await refetch({ take, skip });
            await refetchCount({ status: null, phase: null });
          }
        }}>Filter</Button>
        {(bySearch.error || byStatus.error || byPhase.error) && (
          <Alert severity="error">{bySearch.error?.message || byStatus.error?.message || byPhase.error?.message}</Alert>
        )}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
          <TextField size="small" label="Page size" type="number" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 25); setPage(1); setTake(v); }} sx={{ width: 120 }} />
          <Button size="small" disabled={!canPrev} onClick={async () => {
            if (!canPrev) return;
            const p = Math.max(1, page - 1);
            setPage(p);
            const s = (p - 1) * take;
            if (mode === 'search') await loadSearch({ variables: { q: query.trim(), take, skip: s } });
            else if (mode === 'status') await loadByStatus({ variables: { status, take, skip: s } });
            else if (mode === 'phase') await loadByPhase({ variables: { phase, take, skip: s } });
            else await refetch({ take, skip: s });
          }}>Prev</Button>
          <Typography variant="body2">Page {page}</Typography>
          <Button size="small" disabled={!canNext} onClick={async () => {
            if (!canNext) return;
            const p = page + 1;
            setPage(p);
            const s = (p - 1) * take;
            if (mode === 'search') await loadSearch({ variables: { q: query.trim(), take, skip: s } });
            else if (mode === 'status') await loadByStatus({ variables: { status, take, skip: s } });
            else if (mode === 'phase') await loadByPhase({ variables: { phase, take, skip: s } });
            else await refetch({ take, skip: s });
          }}>Next</Button>
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
                value={po.status}
                onChange={async (e) => {
                  const status = e.target.value as string;
                  try { await updateStatus({ variables: { input: { id: po.id, status } } }); await refetch(); } catch {}
                }}
              >
const POS_SEARCH_COUNT = gql`
  query PurchaseOrdersSearchCount($q: String!) { purchaseOrdersSearchCount(q: $q) }
`;
                {['DRAFT','APPROVED','SENT','RECEIVED','CANCELLED'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          ) },
          { key: 'phase', label: 'Phase', render: (po: any) => po.phase ? (
            <Chip size="small" label={po.phase} color={po.phase === 'RECEIVED' ? 'success' : po.phase === 'RECEIVING' ? 'info' : 'default'} variant="outlined" />
          ) : '—' },
          { key: 'actions', label: 'Actions', render: (po: any) => (
            <Button component={Link} to={`/purchase-orders/${po.id}`} size="small">View</Button>
          ) },
        ] as any), [updateStatus, refetch])}
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
