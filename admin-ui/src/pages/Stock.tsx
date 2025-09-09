import { gql, useQuery } from '@apollo/client';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';

const STOCK = gql`
  query Stock($input: QueryStockInput) {
    stock(input: $input) {
      storeId
      quantity
      reserved
      store { id name }
      productVariant { id barcode size concentration packaging product { name } }
    }
  }
`;

export default function Stock() {
  const [storeId, setStoreId] = React.useState('');
  const [variantId, setVariantId] = React.useState('');
  const { data, loading, error, refetch } = useQuery(STOCK, { variables: { input: { storeId: storeId || null, productVariantId: variantId || null } }, fetchPolicy: 'cache-and-network' });
  const list = data?.stock ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Stock</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Store ID" size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        <TextField label="Variant ID" size="small" value={variantId} onChange={(e) => setVariantId(e.target.value)} />
        <Button variant="contained" onClick={() => refetch()}>Filter</Button>
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'store', label: 'Store', render: (s: any) => s.store?.name || s.storeId, sort: true, accessor: (s: any) => s.store?.name || s.storeId, filter: true },
          { key: 'variant', label: 'Variant', render: (s: any) => s.productVariant?.product?.name || s.productVariant?.barcode || s.productVariant?.id, sort: true, accessor: (s: any) => s.productVariant?.product?.name || s.productVariant?.barcode || s.productVariant?.id, filter: true },
          { key: 'quantity', label: 'Quantity', render: (s: any) => s.quantity, sort: true },
          { key: 'reserved', label: 'Reserved', render: (s: any) => s.reserved, sort: true },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No stock records"
        getRowKey={(s: any) => `${s.storeId}:${s.productVariant?.id || ''}`}
        defaultSortKey="store"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search store/variant"
        globalSearchKeys={['store','variant']}
        enableUrlState
        urlKey="stock"
      />
    </Stack>
  );
}
