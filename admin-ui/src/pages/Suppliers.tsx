import { gql, useQuery } from '@apollo/client';
import { Alert, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import TableList from '../shared/TableList';

const SUPPLIERS = gql`
  query Suppliers {
    suppliers { id name contactInfo creditLimit currentBalance isFrequent }
  }
`;

export default function Suppliers() {
  const { data, loading, error, refetch } = useQuery(SUPPLIERS, { fetchPolicy: 'cache-and-network' });
  const list = data?.suppliers ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Suppliers</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <TableList
        columns={useMemo(() => ([
          { key: 'name', label: 'Name', render: (s: any) => s.name || s.id, sort: true, accessor: (s: any) => s.name || '' },
          { key: 'contact', label: 'Contact', render: (s: any) => {
            let email = '—', phone = '—';
            try { const ci = s.contactInfo || {}; email = ci.email || '—'; phone = ci.phone || '—'; } catch {}
            return `${email} • ${phone}`;
          }, filter: true, filterPlaceholder: 'Email/Phone' },
          { key: 'credit', label: 'Credit', render: (s: any) => s.creditLimit ?? 0, sort: true, accessor: (s: any) => s.creditLimit ?? 0 },
          { key: 'balance', label: 'Balance', render: (s: any) => s.currentBalance ?? 0, sort: true, accessor: (s: any) => s.currentBalance ?? 0 },
          { key: 'flags', label: 'Flags', render: (s: any) => s.isFrequent ? 'Frequent' : '' },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No suppliers"
        getRowKey={(s: any) => s.id}
        defaultSortKey="name"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search supplier"
        globalSearchKeys={['name','contact']}
        enableUrlState
        urlKey="suppliers"
      />
    </Stack>
  );
}
