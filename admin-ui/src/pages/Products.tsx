import { useCreateProductMutation, useProductsQuery, useListFacetsQuery, useBulkAssignFacetToProductsMutation, useBulkRemoveFacetFromProductsMutation } from '../generated/graphql';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';

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
  const { data, loading, error, refetch } = useProductsQuery({ variables: { take, where }, fetchPolicy: 'cache-and-network' as any });
  const list = data?.listProducts ?? [];
  const [createProduct, { loading: creating }] = useCreateProductMutation();
  // Facets for bulk operations
  const { data: facetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const facets: Array<{ id: string; name: string; code: string; values?: string[] }> = facetsData?.listFacets ?? [];
  // Selection controlled via TableList
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);
  const [selFacetId, setSelFacetId] = React.useState('');
  const [selValue, setSelValue] = React.useState('');
  const [bulkAssign, { loading: assigning }] = useBulkAssignFacetToProductsMutation();
  const [bulkRemove, { loading: removing }] = useBulkRemoveFacetFromProductsMutation();
  

  // Export
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : list).map((p: any) => [p.id, p.name || '', p.barcode || '']);
    if (!rows.length) return;
    const header = ['id','name','barcode'];
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
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
      {selectedIds.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Typography variant="body2">Selected: {selectedIds.length}</Typography>
          <Select size="small" value={selFacetId} onChange={(e) => { setSelFacetId(e.target.value); setSelValue(''); }} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value=""><em>Select facet…</em></MenuItem>
            {facets.map((f) => (<MenuItem key={f.id} value={f.id}>{f.name} ({f.code})</MenuItem>))}
          </Select>
          {(() => {
            const f = facets.find((x) => x.id === selFacetId);
            if (f && Array.isArray(f.values) && f.values.length) {
              return (
                <Select size="small" value={selValue} onChange={(e) => setSelValue(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
                  <MenuItem value=""><em>Value…</em></MenuItem>
                  {f.values.map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
                </Select>
              );
            }
            return (<TextField size="small" label="Value" value={selValue} onChange={(e) => setSelValue(e.target.value)} />);
          })()}
          <Button size="small" variant="contained" disabled={!selFacetId || !selValue || !selectedIds.length || assigning} onClick={async () => {
            await bulkAssign({ variables: { productIds: selectedIds as string[], facetId: selFacetId, value: selValue } });
            setSelValue('');
          }}>Assign to selected</Button>
          <Button size="small" color="error" variant="outlined" disabled={!selFacetId || !selValue || !selectedIds.length || removing} onClick={async () => {
            await bulkRemove({ variables: { productIds: selectedIds as string[], facetId: selFacetId, value: selValue } });
            setSelValue('');
          }}>Remove from selected</Button>
        </Stack>
      )}
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
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={(ids) => setSelectedIds(ids)}
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
