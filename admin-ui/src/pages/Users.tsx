import { useUsersQuery } from '../generated/graphql';
import { Alert, Stack, Typography, Box, Button } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

export default function Users() {
  const { data, loading, error, refetch } = useUsersQuery({ variables: { take: 50 }, fetchPolicy: 'cache-and-network' as any });
  const list = data?.listUsers ?? [];
  const [search, setSearch] = React.useState('');
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : list;
    if (!rowsToUse?.length) return;
    const header = ['id','name','email','role','tier'];
    const rows = rowsToUse.map((u: any) => [
      u.id,
      u.customerProfile?.fullName || (u.email?.split?.('@')?.[0] ?? ''),
      u.email,
      u.role?.name || '',
      u.resellerProfile?.tier || '',
    ]);
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u: any) => {
      const name = (u.customerProfile?.fullName || u.email || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role?.name || '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [list, search]);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Users
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage user accounts and export key details for auditing.
        </Typography>
      </Box>
      <ListingHero
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email, or role' }}
        action={(
          <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ borderRadius: 999 }}>
            Refresh
          </Button>
        )}
        density="compact"
      />
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <TableList
        columns={React.useMemo(() => ([
          { key: 'name', label: 'Name', render: (u: any) => u.customerProfile?.fullName || (u.email?.split?.('@')?.[0] ?? '—'), sort: true, filter: true, accessor: (u: any) => u.customerProfile?.fullName || (u.email || '') },
          { key: 'email', label: 'Email', sort: true, filter: true },
          { key: 'role', label: 'Role', render: (u: any) => u.role?.name || '—', sort: true, accessor: (u: any) => u.role?.name || '' },
          { key: 'id', label: 'User ID' },
        ] as any), [])}
        rows={filtered}
        loading={loading}
        emptyMessage="No users"
        getRowKey={(u: any) => u.id}
        defaultSortKey="name"
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="users"
        onExport={exportCsv}
        exportScopeControl
      />
    </Stack>
  );
}
