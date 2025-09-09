import { gql, useQuery } from '@apollo/client';
import { Alert, Chip, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';

const LIST = gql`
  query Resellers($status: String, $take: Int, $q: String) {
    resellers(status: $status, take: $take, q: $q) {
      userId
      profileStatus
      tier
      creditLimit
      requestedAt
      user { id email }
      biller { id email }
      requestedBiller { id email }
    }
  }
`;

function statusColor(s?: string) {
  switch ((s || '').toUpperCase()) {
    case 'ACTIVE': return 'success';
    case 'PENDING': return 'warning';
    case 'REJECTED': return 'error';
    default: return 'default';
  }
}

export default function Resellers() {
  const [status, setStatus] = useState<string>('PENDING');
  const [q, setQ] = useState('');
  const { data, loading, error, refetch } = useQuery(LIST, { variables: { status, take: 50, q }, fetchPolicy: 'cache-and-network' });
  const list = data?.resellers ?? [];
  const navigate = useNavigate();

  useEffect(() => { refetch({ status, q }); }, [status]);

  const header = useMemo(() => (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="h5">Resellers</Typography>
      <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
        {['PENDING','ACTIVE','REJECTED','ALL'].map((s) => (
          <MenuItem key={s} value={s === 'ALL' ? '' : s}>{s || 'ALL'}</MenuItem>
        ))}
      </Select>
      <TextField size="small" label="Search email" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') refetch({ status, q }); }} />
    </Stack>
  ), [status, q]);

  const columns = useMemo(() => ([
    { key: 'email', label: 'Email', render: (r: any) => r?.user?.email, sort: true, accessor: (r: any) => r?.user?.email || '' },
    { key: 'status', label: 'Status', render: (r: any) => <Chip label={r.profileStatus} size="small" color={statusColor(r.profileStatus) as any} />, sort: true, accessor: (r: any) => r.profileStatus },
    { key: 'tier', label: 'Tier', render: (r: any) => r.tier, sort: true },
    { key: 'creditLimit', label: 'Credit Limit', render: (r: any) => `₦${(r.creditLimit ?? 0).toLocaleString?.()}`, sort: true },
    { key: 'biller', label: 'Biller', render: (r: any) => r.biller?.email || '—', sort: true, accessor: (r: any) => r.biller?.email || '' },
    { key: 'requestedBiller', label: 'Requested Biller', render: (r: any) => r.requestedBiller?.email || '—', sort: true, accessor: (r: any) => r.requestedBiller?.email || '' },
    { key: 'requestedAt', label: 'Requested At', render: (r: any) => r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—', sort: true, accessor: (r: any) => new Date(r.requestedAt || 0) },
  ]), []);

  return (
    <Stack spacing={2}>
      {header}
      {error && <Alert severity="error">{error.message}</Alert>}
      <TableList
        columns={columns as any}
        rows={list}
        loading={loading}
        emptyMessage="No resellers"
        onRowClick={(row: any) => navigate(`/resellers/${row.userId}`)}
        getRowKey={(row: any) => row.userId}
        defaultSortKey="requestedAt"
        rowsPerPageOptions={[10,25,50,100]}
        showFilters
        globalSearch
        globalSearchPlaceholder="Search email/biller"
        globalSearchKeys={['email','biller','requestedBiller']}
        enableUrlState
        urlKey="resellers"
      />
    </Stack>
  );
}
