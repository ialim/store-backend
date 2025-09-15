import {
  useRequisitionsByStatusQuery,
  useRequisitionsCountByStatusQuery,
  useRequisitionsByStoreQuery,
  useRequisitionsCountByStoreQuery,
} from '../generated/graphql';
import { Alert, Button, Card, CardContent, Stack, Typography, Select, MenuItem, TextField } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { Link } from 'react-router-dom';
import { StoreSelect } from '../shared/IdSelects';


export default function Requisitions() {
  const [status, setStatus] = React.useState('DRAFT');
  const [storeId, setStoreId] = React.useState('');
  const [take, setTake] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const skip = Math.max(0, (page - 1) * take);
  const usingStore = Boolean(storeId && storeId.trim());
  const qByStatus = useRequisitionsByStatusQuery({ variables: { status, storeId: storeId || null, take, skip }, skip: usingStore, fetchPolicy: 'cache-and-network' as any });
  const qByStore = useRequisitionsByStoreQuery({ variables: { storeId, status: status || null, take, skip }, skip: !usingStore, fetchPolicy: 'cache-and-network' as any });
  const cByStatus = useRequisitionsCountByStatusQuery({ variables: { status, storeId: storeId || null }, skip: usingStore, fetchPolicy: 'cache-and-network' as any });
  const cByStore = useRequisitionsCountByStoreQuery({ variables: { storeId, status: status || null }, skip: !usingStore, fetchPolicy: 'cache-and-network' as any });
  const data = usingStore ? qByStore.data : qByStatus.data;
  const loading = usingStore ? qByStore.loading : qByStatus.loading;
  const error = usingStore ? qByStore.error : qByStatus.error;
  const refetch = usingStore ? qByStore.refetch : qByStatus.refetch;
  const refetchCount = usingStore ? cByStore.refetch : cByStatus.refetch;
  const list = (usingStore ? qByStore.data?.requisitionsByStore : qByStatus.data?.requisitionsByStatus) ?? [];
  const total = usingStore ? (cByStore.data?.requisitionsCountByStore ?? 0) : (cByStatus.data?.requisitionsCountByStatus ?? 0);
  const canPrev = page > 1;
  const canNext = skip + list.length < total;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : list).map((r: any) => [r.id, r.storeId, r.requestedById, r.status, new Date(r.createdAt).toISOString()]);
    if (!rows.length) return;
    const header = ['id','storeId','requestedById','status','createdAt'];
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `requisitions-${status}-${skip}-${skip+list.length}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Requisitions</Typography>
      {error && <Alert severity="error" onClick={() => refetch()}> {String(error.message)} </Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Select size="small" value={status} onChange={(e) => {
          const v = e.target.value as string; setStatus(v); setPage(1);
          if (usingStore) { refetchCount({ storeId, status: v || null }); refetch({ storeId, status: v || null, take, skip: 0 }); }
          else { refetchCount({ status: v, storeId: null }); refetch({ status: v, storeId: null, take, skip: 0 }); }
        }} displayEmpty sx={{ minWidth: 160 }}>
          {['DRAFT','SUBMITTED','APPROVED','REJECTED'].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
        </Select>
        <StoreSelect value={storeId} onChange={(id) => { setStoreId(id); setPage(1); if (id) { refetchCount({ storeId: id, status: status || null }); refetch({ storeId: id, status: status || null, take, skip: 0 }); } else { refetchCount({ status, storeId: null }); refetch({ status, storeId: null, take, skip: 0 }); } }} label="Store" />
        <Button variant="outlined" onClick={() => { setPage(1); if (usingStore) { refetchCount({ storeId, status: status || null }); refetch({ storeId, status: status || null, take, skip: 0 }); } else { refetchCount({ status, storeId: null }); refetch({ status, storeId: null, take, skip: 0 }); } }}>Refresh</Button>
        <Button variant="text" onClick={() => {
          const v = 'DRAFT';
          setStatus(v);
          setStoreId('');
          setPage(1);
          refetchCount({ status: v, storeId: null });
          refetch({ status: v, storeId: null, take, skip: 0 });
        }}>Clear</Button>
        <TextField label="Page size" type="number" size="small" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 25); setTake(v); setPage(1); refetch({ status, storeId: storeId || null, take: v, skip: 0 }); }} sx={{ width: 120 }} />
        <Button size="small" disabled={!canPrev} onClick={() => { if (!canPrev) return; const p = Math.max(1, page - 1); setPage(p); if (usingStore) refetch({ storeId, status: status || null, take, skip: (p - 1) * take }); else refetch({ status, storeId: null, take, skip: (p - 1) * take }); }}>Prev</Button>
        <Typography variant="body2">Page {page}</Typography>
        <Button size="small" disabled={!canNext} onClick={() => { if (!canNext) return; const p = page + 1; setPage(p); if (usingStore) refetch({ storeId, status: status || null, take, skip: (p - 1) * take }); else refetch({ status, storeId: null, take, skip: (p - 1) * take }); }}>Next</Button>
        <Typography variant="body2" sx={{ ml: 1, minWidth: 110, textAlign: 'right' }}>{total ? `${rangeStart}–${rangeEnd} of ${total}` : '0 of 0'}</Typography>
      </Stack>
      <Card>
        <CardContent>
          <TableList
            columns={[
              { key: 'id', label: 'ID', render: (r: any) => (<Button size="small" component={Link as any} to={`/requisitions/${r.id}`}>{r.id}</Button>) },
              { key: 'storeId', label: 'Store', render: (r: any) => r.storeId, filter: true },
              { key: 'requestedById', label: 'Requested By', render: (r: any) => r.requestedById, filter: true },
              { key: 'status', label: 'Status', render: (r: any) => r.status, filter: true },
              { key: 'createdAt', label: 'Created', render: (r: any) => new Date(r.createdAt).toLocaleString(), sort: true, accessor: (r: any) => new Date(r.createdAt || 0) },
            ] as any}
            rows={list}
            loading={loading}
            emptyMessage="No requisitions"
            getRowKey={(r: any) => r.id}
            defaultSortKey="createdAt"
            showFilters
            enableUrlState
            urlKey="requisitions"
            onExport={exportCsv}
            exportScopeControl
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
