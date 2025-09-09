import React from 'react';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Chip, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';

const POS = gql`
  query PurchaseOrders { purchaseOrders { id status phase createdAt supplier { id name } } }
`;
const POS_BY_STATUS = gql`
  query PurchaseOrdersByStatus($status: String!) { purchaseOrdersByStatus(status: $status) { id status phase createdAt supplier { id name } } }
`;
const POS_BY_PHASE = gql`
  query PurchaseOrdersByPhase($phase: String!) { purchaseOrdersByPhase(phase: $phase) { id status phase createdAt supplier { id name } } }
`;
const POS_SEARCH = gql`
  query PurchaseOrdersSearch($q: String!) { purchaseOrdersSearch(q: $q) { id status phase createdAt supplier { id name } } }
`;

const UPDATE_STATUS = gql`
  mutation UpdatePOStatus($input: UpdatePurchaseOrderStatusInput!) {
    updatePurchaseOrderStatus(input: $input) { id status phase }
  }
`;

export default function PurchaseOrders() {
  const { data, loading, error, refetch } = useQuery(POS, { fetchPolicy: 'cache-and-network' });
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [status, setStatus] = React.useState<string>('');
  const [phase, setPhase] = React.useState<string>('');
  const [query, setQuery] = React.useState<string>('');
  const [loadByStatus, byStatus] = useLazyQuery(POS_BY_STATUS);
  const [loadByPhase, byPhase] = useLazyQuery(POS_BY_PHASE);
  const [loadSearch, bySearch] = useLazyQuery(POS_SEARCH);
  const list = (bySearch.data?.purchaseOrdersSearch ?? byStatus.data?.purchaseOrdersByStatus ?? byPhase.data?.purchaseOrdersByPhase ?? data?.purchaseOrders) ?? [];
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
            await loadSearch({ variables: { q: query.trim() } });
          } else if (status) {
            await loadByStatus({ variables: { status } });
          } else if (phase) {
            await loadByPhase({ variables: { phase } });
          } else {
            await refetch();
          }
        }}>Filter</Button>
        {(bySearch.error || byStatus.error || byPhase.error) && (
          <Alert severity="error">{bySearch.error?.message || byStatus.error?.message || byPhase.error?.message}</Alert>
        )}
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'id', label: 'ID' },
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
        globalSearchPlaceholder="Search id/supplier"
        globalSearchKeys={['id','supplier']}
        enableUrlState
        urlKey="pos"
      />
    </Stack>
  );
}
