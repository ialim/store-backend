import { gql, useQuery } from '@apollo/client';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';

const VARIANTS = gql`
  query Variants($take: Int, $where: ProductVariantWhereInput) {
    listProductVariants(take: $take, where: $where) {
      id
      name
      size
      concentration
      packaging
      barcode
      price
      resellerPrice
      createdAt
      product { id name }
    }
  }
`;

export default function Variants() {
  const [take, setTake] = React.useState(50);
  const [q, setQ] = React.useState('');
  const where = React.useMemo(() => {
    const sq = (q || '').trim();
    if (sq.length < 2) return undefined;
    return {
      OR: [
        { name: { contains: sq, mode: 'insensitive' } },
        { size: { contains: sq, mode: 'insensitive' } },
        { concentration: { contains: sq, mode: 'insensitive' } },
        { packaging: { contains: sq, mode: 'insensitive' } },
        { barcode: { contains: sq, mode: 'insensitive' } },
        { product: { name: { contains: sq, mode: 'insensitive' } } },
      ],
    } as any;
  }, [q]);
  const { data, loading, error, refetch } = useQuery(VARIANTS, { variables: { take, where }, fetchPolicy: 'cache-and-network' });
  const list = data?.listProductVariants ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Variants</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 50)} sx={{ width: 120 }} />
        <TextField label="Search (name/sku/barcode/product)" size="small" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') refetch(); }} />
      </Stack>
      <TableList
        columns={[
          { key: 'name', label: 'Name', render: (v: any) => v.name || `${v.size} ${v.concentration} ${v.packaging}`.trim(), sort: true, accessor: (v: any) => v.name || '' },
          { key: 'product', label: 'Product', render: (v: any) => v.product?.name || '—', sort: true, accessor: (v: any) => v.product?.name || '', filter: true },
          { key: 'barcode', label: 'Barcode', render: (v: any) => v.barcode || '—', sort: true, filter: true },
          { key: 'price', label: 'Price', render: (v: any) => v.price ?? '—', sort: true, accessor: (v: any) => v.price || 0 },
          { key: 'resellerPrice', label: 'Reseller Price', render: (v: any) => v.resellerPrice ?? '—', sort: true, accessor: (v: any) => v.resellerPrice || 0 },
          { key: 'createdAt', label: 'Created', render: (v: any) => new Date(v.createdAt).toLocaleString(), sort: true, accessor: (v: any) => new Date(v.createdAt || 0) },
        ] as any}
        rows={list}
        loading={loading}
        emptyMessage="No variants"
        getRowKey={(v: any) => v.id}
        defaultSortKey="createdAt"
        showFilters
        enableUrlState
        urlKey="variants"
      />
    </Stack>
  );
}

