import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';

const PRODUCTS = gql`
  query Products($take: Int, $where: ProductWhereInput) {
    listProducts(take: $take, where: $where) { id name barcode categoryId }
  }
`;
const CATEGORIES = gql`
  query ProductCategories { listProductCategorys(take: 200) { id name } }
`;
const CREATE_PRODUCT = gql`
  mutation CreateProduct($data: ProductCreateInput!) { createProduct(data: $data) { id } }
`;

export default function Products() {
  const [take, setTake] = React.useState(20);
  const navigate = useNavigate();
  const [catFilter, setCatFilter] = React.useState('');
  const [q, setQ] = React.useState('');
  const where = React.useMemo(() => {
    const w: any = {};
    if (catFilter) w.categoryId = { equals: catFilter };
    const sq = (q || '').trim();
    if (sq.length >= 2) w.OR = [
      { name: { contains: sq, mode: 'insensitive' } },
      { barcode: { contains: sq, mode: 'insensitive' } },
    ];
    return Object.keys(w).length ? w : undefined;
  }, [catFilter, q]);
  const { data, loading, error, refetch } = useQuery(PRODUCTS, { variables: { take, where }, fetchPolicy: 'cache-and-network' });
  const { data: catData } = useQuery(CATEGORIES, { fetchPolicy: 'cache-first' });
  const categories = catData?.listProductCategorys ?? [];
  const list = data?.listProducts ?? [];
  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT);
  

  // Export
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : list).map((p: any) => [
      p.id,
      p.name || '',
      p.barcode || '',
      (categories.find((c: any) => c.id === p.categoryId)?.name) || p.categoryId || '',
    ]);
    if (!rows.length) return;
    const header = ['id','name','barcode','category'];
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
  const [categoryId, setCategoryId] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('');
  const canSubmit = !!name && (!!categoryId || !!newCategory);
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ flex: 1 }}>Products</Typography>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>New Product</Button>
      </Stack>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 20)} sx={{ width: 120 }} />
        <Select size="small" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
          <MenuItem value=""><em>All categories…</em></MenuItem>
          {categories.map((c: any) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </Select>
        <TextField label="Search name/barcode" size="small" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') refetch(); }} />
      </Stack>
      <TableList
        columns={React.useMemo(() => ([
          { key: 'name', label: 'Name', render: (p: any) => p.name || p.id, sort: true, accessor: (p: any) => p.name || '', filter: true },
          { key: 'barcode', label: 'Barcode', render: (p: any) => p.barcode || '—', sort: true, filter: true },
          { key: 'category', label: 'Category', render: (p: any) => (categories.find((c: any) => c.id === p.categoryId)?.name) || p.categoryId || '—', sort: true, accessor: (p: any) => (categories.find((c: any) => c.id === p.categoryId)?.name) || '', filter: true },
          { key: 'id', label: 'Product ID' },
        ] as any), [categories])}
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
            <Select size="small" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} displayEmpty>
              <MenuItem value=""><em>Select category…</em></MenuItem>
              {categories.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            <TextField label="Or create new category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !canSubmit}
            onClick={async () => {
              try {
                const cat = newCategory.trim().length
                  ? { connectOrCreate: { where: { name: newCategory.trim() }, create: { name: newCategory.trim() } } }
                  : { connect: { id: categoryId } };
                const res = await createProduct({ variables: { data: { name, barcode: barcode || null, description: description || null, category: cat } } });
                setOpen(false);
                setName(''); setBarcode(''); setDescription(''); setCategoryId(''); setNewCategory('');
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
