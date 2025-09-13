import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';

const PRODUCTS = gql`
  query Products($take: Int, $where: ProductWhereInput) {
    listProducts(take: $take, where: $where) { id name barcode }
  }
`;
const CREATE_PRODUCT = gql`
  mutation CreateProduct($data: ProductCreateInput!) { createProduct(data: $data) { id } }
`;

export default function Products() {
  const [take, setTake] = React.useState(20);
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const where = React.useMemo(() => {
    const w: any = {};
    const sq = (q || '').trim();
    if (sq.length >= 2) w.OR = [
      { name: { contains: sq, mode: 'insensitive' } },
      { barcode: { contains: sq, mode: 'insensitive' } },
    ];
    return Object.keys(w).length ? w : undefined;
  }, [q]);
  const { data, loading, error, refetch } = useQuery(PRODUCTS, { variables: { take, where }, fetchPolicy: 'cache-and-network' });
  const list = data?.listProducts ?? [];
  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT);
  

  // Export
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : list).map((p: any) => [p.id, p.name || '', p.barcode || '']);
    if (!rows.length) return;
    const header = ['id','name','barcode'];
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url);
  };

  // New product dialog
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const canSubmit = !!name;
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ flex: 1 }}>Products</Typography>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>New Product</Button>
      </Stack>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 20)} sx={{ width: 120 }} />
        <TextField label="Search name/barcode" size="small" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') refetch(); }} />
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'name', label: 'Name', render: (p: any) => p.name || p.id, sort: true, accessor: (p: any) => p.name || '', filter: true },
          { key: 'barcode', label: 'Barcode', render: (p: any) => p.barcode || '—', sort: true, filter: true },
          { key: 'id', label: 'Product ID' },
        ] as any), [])}
        rows={list}
        loading={loading}
        emptyMessage="No products"
        getRowKey={(p: any) => p.id}
        onRowClick={(p: any) => navigate(`/products/${p.id}`)}
        defaultSortKey="name"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search products"
        globalSearchKeys={['name','barcode','category']}
        enableUrlState
        urlKey="products"
        onExport={exportCsv}
        exportScopeControl
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Product</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
            
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !canSubmit}
            onClick={async () => {
              try {
                const res = await createProduct({ variables: { data: { name, barcode: barcode || null, description: description || null } } });
                setOpen(false);
                setName(''); setBarcode(''); setDescription('');
                await refetch();
                if (res.data?.createProduct?.id) navigate(`/products/${res.data.createProduct.id}`);
              } catch (e) {}
            }}
          >{creating ? 'Creating…' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
