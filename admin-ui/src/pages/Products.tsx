import { gql, useQuery } from '@apollo/client';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';

const PRODUCTS = gql`
  query Products($take: Int) { listProducts(take: $take) { id name barcode categoryId } }
`;

export default function Products() {
  const [take, setTake] = React.useState(20);
  const { data, loading, error, refetch } = useQuery(PRODUCTS, { variables: { take }, fetchPolicy: 'cache-and-network' });
  const list = data?.listProducts ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Products</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 20)} sx={{ width: 120 }} />
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'name', label: 'Name', render: (p: any) => p.name || p.id, sort: true, accessor: (p: any) => p.name || '', filter: true },
          { key: 'barcode', label: 'Barcode', render: (p: any) => p.barcode || '—', sort: true, filter: true },
          { key: 'categoryId', label: 'Category ID', render: (p: any) => p.categoryId || '—' },
          { key: 'id', label: 'Product ID' },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No products"
        getRowKey={(p: any) => p.id}
        defaultSortKey="name"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search products"
        globalSearchKeys={['name','barcode']}
        enableUrlState
        urlKey="products"
      />
    </Stack>
  );
}
