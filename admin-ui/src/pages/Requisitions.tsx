import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography, Select, MenuItem } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { Link } from 'react-router-dom';

const REQS = gql`
  query RequisitionsByStatus($status: String!, $storeId: String, $take: Int, $skip: Int) {
    requisitionsByStatus(status: $status, storeId: $storeId, take: $take, skip: $skip) { id storeId requestedById status createdAt }
  }
`;
const REQS_COUNT = gql`query RequisitionsCountByStatus($status: String!, $storeId: String) { requisitionsCountByStatus(status: $status, storeId: $storeId) }`;

export default function Requisitions() {
  const [status, setStatus] = React.useState('DRAFT');
  const [storeId, setStoreId] = React.useState('');
  const [take, setTake] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const skip = Math.max(0, (page - 1) * take);
  const { data, loading, error, refetch } = useQuery(REQS, { variables: { status, storeId: storeId || null, take, skip }, fetchPolicy: 'cache-and-network' });
  const { data: countData, refetch: refetchCount } = useQuery(REQS_COUNT, { variables: { status, storeId: storeId || null }, fetchPolicy: 'cache-and-network' });
  const list = data?.requisitionsByStatus ?? [];
  const total = countData?.requisitionsCountByStatus ?? 0;
  const canPrev = page > 1;
  const canNext = skip + list.length < total;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Requisitions</Typography>
      {error && <Alert severity="error" onClick={() => refetch()}> {String(error.message)} </Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Select size="small" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); refetchCount({ status: e.target.value, storeId: storeId || null }); refetch({ status: e.target.value, storeId: storeId || null, take, skip: 0 }); }} displayEmpty sx={{ minWidth: 160 }}>
          {['DRAFT','SUBMITTED','APPROVED','REJECTED'].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
        </Select>
        <TextField size="small" label="Store ID filter" value={storeId} onChange={(e) => { setStoreId(e.target.value); setPage(1); }} onBlur={() => { refetchCount({ status, storeId: storeId || null }); refetch({ status, storeId: storeId || null, take, skip: 0 }); }} />
        <Button variant="outlined" onClick={() => { setPage(1); refetchCount({ status, storeId: storeId || null }); refetch({ status, storeId: storeId || null, take, skip: 0 }); }}>Refresh</Button>
        <TextField label="Page size" type="number" size="small" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 25); setTake(v); setPage(1); refetch({ status, storeId: storeId || null, take: v, skip: 0 }); }} sx={{ width: 120 }} />
        <Button size="small" disabled={!canPrev} onClick={() => { if (!canPrev) return; const p = Math.max(1, page - 1); setPage(p); refetch({ status, storeId: storeId || null, take, skip: (p - 1) * take }); }}>Prev</Button>
        <Typography variant="body2">Page {page}</Typography>
        <Button size="small" disabled={!canNext} onClick={() => { if (!canNext) return; const p = page + 1; setPage(p); refetch({ status, storeId: storeId || null, take, skip: (p - 1) * take }); }}>Next</Button>
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
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
