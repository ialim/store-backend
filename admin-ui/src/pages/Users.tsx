import { gql, useQuery } from '@apollo/client';
import { Alert, Stack, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';

const USERS = gql`
  query Users($take: Int) {
    listUsers(take: $take) {
      id
      email
      role { name }
      customerProfile { fullName }
      resellerProfile { tier }
    }
  }
`;

export default function Users() {
  const { data, loading, error, refetch } = useQuery(USERS, { variables: { take: 50 }, fetchPolicy: 'cache-and-network' });
  const list = data?.listUsers ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Users</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <TableList
        columns={React.useMemo(() => ([
          { key: 'name', label: 'Name', render: (u: any) => u.customerProfile?.fullName || (u.email?.split?.('@')?.[0] ?? '—'), sort: true, filter: true, accessor: (u: any) => u.customerProfile?.fullName || (u.email || '') },
          { key: 'email', label: 'Email', sort: true, filter: true },
          { key: 'role', label: 'Role', render: (u: any) => u.role?.name || '—', sort: true, accessor: (u: any) => u.role?.name || '' },
          { key: 'id', label: 'User ID' },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No users"
        getRowKey={(u: any) => u.id}
        defaultSortKey="name"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search name/email/role"
        globalSearchKeys={['name','email','role']}
        enableUrlState
        urlKey="users"
      />
    </Stack>
  );
}
