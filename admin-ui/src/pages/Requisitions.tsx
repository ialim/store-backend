import { gql, useLazyQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography, Select, MenuItem } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { Link } from 'react-router-dom';

const REQS = gql`
  query RequisitionsByStatus($status: String!) {
    requisitionsByStatus(status: $status) { id storeId requestedById status createdAt }
  }
`;

export default function Requisitions() {
  const [status, setStatus] = React.useState('DRAFT');
  const [storeId, setStoreId] = React.useState('');
  const [load, { data, loading, error, refetch }] = useLazyQuery(REQS, { fetchPolicy: 'cache-and-network' });
  React.useEffect(() => { load({ variables: { status } }); }, [status, load]);
  const listAll = data?.requisitionsByStatus ?? [];
  const list = React.useMemo(() => (storeId ? listAll.filter((r: any) => (r.storeId || '').includes(storeId)) : listAll), [listAll, storeId]);
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Requisitions</Typography>
      {error && <Alert severity="error" onClick={() => refetch?.()}> {String(error.message)} </Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          {['DRAFT','SUBMITTED','APPROVED','REJECTED'].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
        </Select>
        <TextField size="small" label="Store ID filter" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        <Button variant="outlined" onClick={() => refetch?.()}>Refresh</Button>
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

