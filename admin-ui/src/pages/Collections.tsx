import React from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import TableList from '../shared/TableList';
import { useCollectionsQuery, useCreateCollectionMutation, useUpdateCollectionMutation, useDeleteCollectionMutation, useListFacetsQuery, useCollectionMembersCountLazyQuery, useCollectionVariantsLazyQuery, useCollectionProductsLazyQuery } from '../generated/graphql';

type FacetFilter = { facetId: string; value: string };

export default function Collections() {
  const { data, loading, error, refetch } = useCollectionsQuery({ fetchPolicy: 'cache-and-network' as any });
  const list = data?.collections ?? [];
  const { data: facetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const facets: Array<{ id: string; name: string; code: string; values?: string[] }> = facetsData?.listFacets ?? [];
  const [createCollection] = useCreateCollectionMutation();
  const [updateCollection] = useUpdateCollectionMutation();
  const [deleteCollection] = useDeleteCollectionMutation();

  // Member preview state
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = React.useState<'PRODUCT' | 'VARIANT' | null>(null);
  const [take, setTake] = React.useState(50);
  const [page, setPage] = React.useState(1);
  const [loadCount, { data: countData }] = useCollectionMembersCountLazyQuery();
  const [loadVars, { data: varsData }] = useCollectionVariantsLazyQuery();
  const [loadProds, { data: prodsData }] = useCollectionProductsLazyQuery();
  const membersCount = countData?.collectionMembersCount ?? null;
  const variants = varsData?.collectionVariants ?? [];
  const products = prodsData?.collectionProducts ?? [];

  const refreshPreview = async (id: string, target: 'PRODUCT' | 'VARIANT') => {
    setPreviewId(id);
    setPreviewTarget(target);
    setPage(1);
    await loadCount({ variables: { id } });
    if (target === 'VARIANT') await loadVars({ variables: { id, take, skip: 0 } });
    else await loadProds({ variables: { id, take, skip: 0 } });
  };

  const total = membersCount ?? 0;
  const canPrev = page > 1;
  const canNext = previewId != null && (page - 1) * take + (variants?.length || products?.length || 0) < total;
  const goPage = async (p: number) => {
    if (!previewId || !previewTarget) return;
    const skip = Math.max(0, (p - 1) * take);
    setPage(p);
    if (previewTarget === 'VARIANT') await loadVars({ variables: { id: previewId, take, skip } });
    else await loadProds({ variables: { id: previewId, take, skip } });
  };

  const exportMembers = async () => {
    if (!previewId || !previewTarget) return;
    const all: any[] = [];
    const pageSize = 500;
    let skip = 0;
    const count = membersCount || 0;
    while (skip < count) {
      if (previewTarget === 'VARIANT') {
        const res = await loadVars({ variables: { id: previewId, take: pageSize, skip } });
        const chunk = (res.data?.collectionVariants ?? []) as any[];
        all.push(...chunk);
      } else {
        const res = await loadProds({ variables: { id: previewId, take: pageSize, skip } });
        const chunk = (res.data?.collectionProducts ?? []) as any[];
        all.push(...chunk);
      }
      skip += pageSize;
    }
    const rows = previewTarget === 'VARIANT'
      ? all.map((v) => [v.id, v.name || '', v.product?.name || '', v.barcode || '', v.size || '', v.concentration || '', v.packaging || ''])
      : all.map((p) => [p.id, p.name || '', p.barcode || '']);
    const header = previewTarget === 'VARIANT'
      ? ['id','variantName','productName','barcode','size','concentration','packaging']
      : ['id','name','barcode'];
    exportCsv(header, rows, `collection-${previewId}-${previewTarget.toLowerCase()}.csv`);
  };

  // Create/Edit dialog
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [target, setTarget] = React.useState<'PRODUCT' | 'VARIANT'>('VARIANT');
  const [filters, setFilters] = React.useState<FacetFilter[]>([]);
  const reset = () => { setEditId(null); setName(''); setCode(''); setTarget('VARIANT'); setFilters([]); };
  const startCreate = () => { reset(); setOpen(true); };
  const startEdit = (c: any) => {
    setEditId(c.id); setName(c.name); setCode(c.code); setTarget(c.target); setFilters(Array.isArray(c.filters) ? c.filters : []); setOpen(true);
  };
  const save = async () => {
    const input = { name, code, target, filters } as any;
    if (editId) await updateCollection({ variables: { input: { id: editId, name, code, filters } } });
    else await createCollection({ variables: { input } });
    setOpen(false); reset(); await refetch();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Collections</Typography>
        <Button size="small" variant="outlined" onClick={startCreate}>New Collection</Button>
      </Stack>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Card><CardContent>
        <TableList
          columns={[
            { key: 'name', label: 'Name', sort: true, filter: true },
            { key: 'code', label: 'Code', sort: true, filter: true },
            { key: 'target', label: 'Target', sort: true },
            { key: 'filters', label: 'Filters', render: (c: any) => renderFilters(c.filters, facets) },
            { key: 'actions', label: 'Actions', render: (c: any) => (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => startEdit(c)}>Edit</Button>
                <Button size="small" color="error" onClick={async () => { if (!window.confirm('Delete this collection?')) return; await deleteCollection({ variables: { id: c.id } }); await refetch(); }}>Delete</Button>
                <Button size="small" variant="outlined" onClick={() => refreshPreview(c.id, c.target)}>Preview</Button>
              </Stack>
            )},
          ] as any}
          rows={list}
          loading={loading}
          emptyMessage="No collections"
          getRowKey={(c: any) => c.id}
          defaultSortKey="name"
          showFilters
          enableUrlState
          urlKey="collections"
        />
      </CardContent></Card>

      {previewId && previewTarget && (
        <Card><CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1 }}>Preview Members{membersCount != null ? ` (${membersCount})` : ''}</Typography>
            <TextField size="small" type="number" label="Page size" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 50); setTake(v); setPage(1); goPage(1); }} sx={{ width: 140 }} />
            <Button size="small" disabled={!canPrev} onClick={() => canPrev && goPage(Math.max(1, page - 1))}>Prev</Button>
            <Typography variant="body2">Page {page}</Typography>
            <Button size="small" disabled={!canNext} onClick={() => canNext && goPage(page + 1)}>Next</Button>
            <Button size="small" variant="outlined" onClick={exportMembers} disabled={!membersCount}>Export CSV</Button>
          </Stack>
          {previewTarget === 'VARIANT' && variants?.length > 0 && (
            <TableList
              columns={[
                { key: 'name', label: 'Name', render: (v: any) => v.name || v.product?.name || '—', sort: true, accessor: (v: any) => v.name || v.product?.name || '' },
                { key: 'barcode', label: 'Barcode', filter: true, sort: true },
                { key: 'product', label: 'Product', render: (v: any) => v.product?.name || '—', sort: true, accessor: (v: any) => v.product?.name || '' },
                { key: 'size', label: 'Size', filter: true, sort: true },
                { key: 'concentration', label: 'Concentration', filter: true, sort: true },
                { key: 'packaging', label: 'Packaging', filter: true, sort: true },
              ] as any}
              rows={variants}
              paginated={false}
              emptyMessage="No variants"
            />
          )}
          {previewTarget === 'PRODUCT' && products?.length > 0 && (
            <TableList
              columns={[
                { key: 'name', label: 'Name', filter: true, sort: true },
                { key: 'barcode', label: 'Barcode', filter: true, sort: true },
                { key: 'id', label: 'ID' },
              ] as any}
              rows={products}
              paginated={false}
              emptyMessage="No products"
            />
          )}
          {((previewTarget === 'VARIANT' && !variants?.length) || (previewTarget === 'PRODUCT' && !products?.length)) && (
            <Box sx={{ color: 'text.secondary' }}>No preview data</Box>
          )}
        </CardContent></Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Edit Collection' : 'New Collection'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
            <Select size="small" value={target} onChange={(e) => setTarget(e.target.value as any)}>
              <MenuItem value="VARIANT">Variants</MenuItem>
              <MenuItem value="PRODUCT">Products</MenuItem>
            </Select>
            <Typography variant="subtitle2">Filters</Typography>
            {filters.map((f, idx) => (
              <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Select size="small" value={f.facetId} onChange={(e) => updateFilter(idx, { facetId: e.target.value })} displayEmpty sx={{ minWidth: 220 }}>
                  <MenuItem value=""><em>Facet…</em></MenuItem>
                  {facets.map((fa) => (<MenuItem key={fa.id} value={fa.id}>{fa.name} ({fa.code})</MenuItem>))}
                </Select>
                {(() => {
                  const fa = facets.find((x) => x.id === f.facetId);
                  if (fa && Array.isArray(fa.values) && fa.values.length) {
                    return (
                      <Select size="small" value={f.value} onChange={(e) => updateFilter(idx, { value: e.target.value })} displayEmpty sx={{ minWidth: 180 }}>
                        <MenuItem value=""><em>Value…</em></MenuItem>
                        {fa.values.map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
                      </Select>
                    );
                  }
                  return (<TextField size="small" label="Value" value={f.value} onChange={(e) => updateFilter(idx, { value: e.target.value })} />);
                })()}
                <Button size="small" color="error" onClick={() => removeFilter(idx)}>Remove</Button>
              </Stack>
            ))}
            <Button size="small" onClick={() => setFilters((arr) => arr.concat({ facetId: '', value: '' }))}>Add Filter</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!name || !code}>Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );

  function updateFilter(idx: number, patch: Partial<FacetFilter>) {
    setFilters((arr) => arr.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function removeFilter(idx: number) {
    setFilters((arr) => arr.filter((_, i) => i !== idx));
  }
}

function renderFilters(filters: any, facets: any[]) {
  const list = Array.isArray(filters) ? filters : [];
  if (!list.length) return '—';
  const label = (facetId: string) => {
    const f = facets.find((fa) => fa.id === facetId);
    return f ? `${f.name} (${f.code})` : facetId;
  };
  return list.map((f, i) => `${label(f.facetId)}: ${f.value}`).join('; ');
}

function exportCsv(header: string[], rows: any[][], filename: string) {
  const csv = [header, ...rows]
    .map((r) => r.map((v) => JSON.stringify(v ?? '')).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
