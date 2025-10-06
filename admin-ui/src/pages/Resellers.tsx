import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Chip, MenuItem, Select, Stack, Box, Typography } from '@mui/material';
import { useResellersQuery } from '../generated/graphql';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';
import { ListingHero } from '../shared/ListingLayout';

function statusColor(s?: string) {
  switch ((s || '').toUpperCase()) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

export default function Resellers() {
  const TAKE = 50;
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('PENDING');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');

  const { data, loading, error, refetch } = useResellersQuery({
    variables: { status, take: TAKE, q: appliedQ },
    fetchPolicy: 'cache-and-network' as any,
  });

  const list = data?.resellers ?? [];

  useEffect(() => {
    const handle = window.setTimeout(() => setAppliedQ(q.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  const statusOptions = useMemo(() => ['ALL', 'PENDING', 'ACTIVE', 'REJECTED'], []);

  const columns = useMemo(
    () => [
      {
        key: 'email',
        label: 'Email',
        render: (r: any) => r?.user?.email,
        sort: true,
        accessor: (r: any) => r?.user?.email || '',
      },
      {
        key: 'status',
        label: 'Status',
        render: (r: any) => (
          <Chip label={r.profileStatus} size="small" color={statusColor(r.profileStatus) as any} />
        ),
        sort: true,
        accessor: (r: any) => r.profileStatus,
      },
      { key: 'tier', label: 'Tier', render: (r: any) => r.tier, sort: true },
      {
        key: 'creditLimit',
        label: 'Credit Limit',
        render: (r: any) => formatMoney(r.creditLimit),
        sort: true,
        accessor: (r: any) => r.creditLimit || 0,
      },
      {
        key: 'biller',
        label: 'Biller',
        render: (r: any) => r.biller?.email || '—',
        sort: true,
        accessor: (r: any) => r.biller?.email || '',
      },
      {
        key: 'requestedBiller',
        label: 'Requested Biller',
        render: (r: any) => r.requestedBiller?.email || '—',
        sort: true,
        accessor: (r: any) => r.requestedBiller?.email || '',
      },
      {
        key: 'requestedAt',
        label: 'Requested At',
        render: (r: any) => (r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—'),
        sort: true,
        accessor: (r: any) => new Date(r.requestedAt || 0),
      },
    ],
    [],
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Resellers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review reseller accounts, credit limits, and billing assignments.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: q,
          onChange: setQ,
          placeholder: 'Search by email or biller',
          onSubmit: () => setAppliedQ(q.trim()),
        }}
        trailing={(
          <Select
            size="small"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 180, borderRadius: 999 }}
          >
            {statusOptions.map((s) => (
              <MenuItem key={s} value={s === 'ALL' ? '' : s}>
                {s === 'ALL' ? 'All statuses' : s}
              </MenuItem>
            ))}
          </Select>
        )}
        density="compact"
      />

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message}
        </Alert>
      )}

      <TableList
        columns={columns as any}
        rows={list}
        loading={loading}
        emptyMessage="No resellers"
        onRowClick={(row: any) => navigate(`/resellers/${row.userId}`)}
        getRowKey={(row: any) => row.userId}
        defaultSortKey="requestedAt"
        rowsPerPageOptions={[10, 25, 50, 100]}
        showFilters
        globalSearch
        globalSearchPlaceholder="Search email/biller"
        globalSearchKeys={['email', 'biller', 'requestedBiller']}
        enableUrlState
        urlKey="resellers"
      />
    </Stack>
  );
}
