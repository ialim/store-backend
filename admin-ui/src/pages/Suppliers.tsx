import { useSuppliersQuery } from '../generated/graphql';
import { Alert, Stack, Box, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

export default function Suppliers() {
  const { data, loading, error, refetch } = useSuppliersQuery({ fetchPolicy: 'cache-and-network' as any });
  const [search, setSearch] = React.useState('');
  const list = data?.listSuppliers ?? [];
  const filteredList = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s: any) => {
      const name = (s.name || '').toLowerCase();
      const contactInfo = (() => {
        try {
          const ci = s.contactInfo || {};
          return `${ci.email || ''} ${ci.phone || ''}`.toLowerCase();
        } catch (err) {
          return '';
        }
      })();
      return name.includes(term) || contactInfo.includes(term);
    });
  }, [list, search]);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Suppliers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Maintain supplier contacts, credit limits, and balances.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search supplier name, email, or phone',
        }}
        density="compact"
      />
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <TableList
        columns={React.useMemo(() => ([
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
        rows={filteredList}
        loading={loading}
        emptyMessage="No suppliers"
        getRowKey={(s: any) => s.id}
        defaultSortKey="name"
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="suppliers"
      />
    </Stack>
  );
}
