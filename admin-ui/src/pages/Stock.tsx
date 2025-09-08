import { gql, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Grid, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React from 'react';

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
      {loading && !list.length ? (
        <Skeleton variant="rectangular" height={120} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Store</TableCell>
              <TableCell>Variant</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Reserved</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((s: any) => (
              <TableRow key={`${s.storeId}:${s.productVariant?.id || ''}`} hover>
                <TableCell>{s.store?.name || s.storeId}</TableCell>
                <TableCell>{s.productVariant?.product?.name || s.productVariant?.barcode || s.productVariant?.id}</TableCell>
                <TableCell>{s.quantity}</TableCell>
                <TableCell>{s.reserved}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
