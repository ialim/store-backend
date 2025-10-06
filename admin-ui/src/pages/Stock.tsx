import { useStockQuery } from '../generated/graphql';
import { Alert, Button, Stack, TextField, Box, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

export default function Stock() {
  const [storeId, setStoreId] = React.useState('');
  const [variantId, setVariantId] = React.useState('');
  const { data, loading, error, refetch } = useStockQuery({ variables: { input: { storeId: storeId || null, productVariantId: variantId || null } }, fetchPolicy: 'cache-and-network' as any });
  const list = data?.stock ?? [];
  const applyFilters = React.useCallback(() => {
    void refetch({ input: { storeId: storeId || null, productVariantId: variantId || null } });
  }, [refetch, storeId, variantId]);

  const clearFilters = React.useCallback(() => {
    setStoreId('');
    setVariantId('');
    void refetch({ input: { storeId: null, productVariantId: null } });
  }, [refetch]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Stock
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Check inventory by store and product variant.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: variantId,
          onChange: setVariantId,
          placeholder: 'Search by variant ID or barcode',
          onSubmit: applyFilters,
        }}
        trailing={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              label="Store ID"
              size="small"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <Button variant="contained" size="small" onClick={applyFilters}>
              Apply
            </Button>
            {(storeId || variantId) && (
              <Button variant="text" size="small" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </Stack>
        )}
        density="compact"
      />
      {error && <Alert severity="error" onClick={() => applyFilters()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <TableList
        columns={React.useMemo(() => ([
          { key: 'store', label: 'Store', render: (s: any) => s.store?.name || s.storeId, sort: true, accessor: (s: any) => s.store?.name || s.storeId, filter: true },
          {
            key: 'variant',
            label: 'Variant',
            render: (s: any) =>
              s.productVariant?.name ||
              s.productVariant?.product?.name ||
              s.productVariant?.barcode ||
              s.productVariant?.id,
            sort: true,
            accessor: (s: any) =>
              s.productVariant?.name ||
              s.productVariant?.product?.name ||
              s.productVariant?.barcode ||
              s.productVariant?.id,
            filter: true,
          },
          { key: 'quantity', label: 'Quantity', render: (s: any) => s.quantity, sort: true },
          { key: 'reserved', label: 'Reserved', render: (s: any) => s.reserved, sort: true },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No stock records"
        getRowKey={(s: any) => `${s.storeId}:${s.productVariant?.id || ''}`}
        defaultSortKey="store"
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="stock"
      />
    </Stack>
  );
}
