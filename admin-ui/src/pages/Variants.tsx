import { useAssignFacetToVariantMutation, useListFacetsQuery, useProductVariantsCountQuery, useVariantFacetsQuery, useRemoveFacetFromVariantMutation, useBulkAssignFacetToVariantsMutation, useBulkRemoveFacetFromVariantsMutation } from '../generated/graphql';
import { useVariantsQuery } from '../generated/graphql';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import React from 'react';
import TableList from '../shared/TableList';


export default function Variants() {
  const auth = useAuth();
  const isManager = auth.hasRole('SUPERADMIN','ADMIN','MANAGER') || auth.hasPermission('MANAGE_PRODUCTS');
  const navigate = useNavigate();
  const [take, setTake] = React.useState(50);
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  // Facet filters
  const { data: facetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const allFacets: Array<{ id: string; name: string; code: string; values?: string[]; isPrivate?: boolean }>
    = facetsData?.listFacets ?? [];
  const [filterFacetId, setFilterFacetId] = React.useState('');
  const [filterFacetValue, setFilterFacetValue] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const where = React.useMemo(() => {
    const sq = (q || '').trim();
    const w: any = {};
    if (sq.length >= 2) {
      w.OR = [
        { name: { contains: sq, mode: 'insensitive' } },
        { size: { contains: sq, mode: 'insensitive' } },
        { concentration: { contains: sq, mode: 'insensitive' } },
        { packaging: { contains: sq, mode: 'insensitive' } },
        { barcode: { contains: sq, mode: 'insensitive' } },
        { product: { is: { name: { contains: sq, mode: 'insensitive' } } } },
      ];
    }
    if (filterFacetId && filterFacetValue) {
      // Filter by facet code/value
      const facet = allFacets.find((f) => f.id === filterFacetId);
      if (facet) {
        w.AND = (w.AND || []).concat({
          facets: {
            some: {
              facet: { is: { code: { equals: facet.code } } },
              value: { equals: filterFacetValue },
            },
          },
        });
      }
    }
    if (gender) {
      w.AND = (w.AND || []).concat({ facets: { some: { facet: { is: { code: { equals: 'gender' } } }, value: { equals: gender } } } });
    }
    if (brand) {
      w.AND = (w.AND || []).concat({ facets: { some: { facet: { is: { code: { equals: 'brand' } } }, value: { equals: brand } } } });
    }
    return Object.keys(w).length ? w : undefined;
  }, [q, filterFacetId, filterFacetValue, allFacets, gender, brand]);
  const skip = Math.max(0, (page - 1) * take);
  const { data, loading, error, refetch } = useVariantsQuery({ variables: { take, skip, where }, fetchPolicy: 'cache-and-network' as any });
  const { data: countData, refetch: refetchVariantCount } = useProductVariantsCountQuery({ variables: { where }, fetchPolicy: 'cache-and-network' as any });
  const list = data?.listProductVariants ?? [];
  const total = countData?.productVariantsCount ?? 0;
  const canPrev = page > 1;
  const canNext = skip + list.length < total;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;
  // Debounced search on text input; rely on where dependency
  React.useEffect(() => {
    const h = setTimeout(async () => {
      setPage(1);
      await refetch({ take, skip: 0, where });
      await refetchVariantCount({ where });
    }, 300);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterFacetId, filterFacetValue, gender, brand, take]);

  // Selection for bulk operations via TableList API
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);
  const clearSelection = () => setSelectedIds([]);

  // Bulk facet assign/remove
  const [bulkFacetId, setBulkFacetId] = React.useState('');
  const [bulkValue, setBulkValue] = React.useState('');
  const [bulkAssign, { loading: bulkAssignLoading }] = useBulkAssignFacetToVariantsMutation();
  const [bulkRemove, { loading: bulkRemoveLoading }] = useBulkRemoveFacetFromVariantsMutation();
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Variants</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Page size" type="number" size="small" value={take} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 50); setPage(1); setTake(v); refetch(); refetchVariantCount(); }} sx={{ width: 120 }} />
        <TextField label="Search (name/sku/barcode/product)" size="small" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') refetch(); }} />
        {(() => {
          const genderFacet = allFacets.find((f) => f.code.toLowerCase() === 'gender');
          const brandFacet = allFacets.find((f) => f.code.toLowerCase() === 'brand');
          return (
            <>
              <Select size="small" value={gender} onChange={(e) => setGender(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
                <MenuItem value=""><em>Gender</em></MenuItem>
                {(genderFacet?.values || ['Male','Female','Unisex']).map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
              </Select>
              <Select size="small" value={brand} onChange={(e) => setBrand(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
                <MenuItem value=""><em>Brand</em></MenuItem>
                {(brandFacet?.values || []).map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
              </Select>
            </>
          );
        })()}
        <Select size="small" value={filterFacetId} onChange={(e) => { setFilterFacetId(e.target.value); setFilterFacetValue(''); }} displayEmpty sx={{ minWidth: 220 }}>
          <MenuItem value=""><em>Facet filter…</em></MenuItem>
          {allFacets.map((f) => (<MenuItem key={f.id} value={f.id}>{f.name} ({f.code})</MenuItem>))}
        </Select>
        {filterFacetId && (() => {
          const f = allFacets.find((x) => x.id === filterFacetId);
          if (f && Array.isArray(f.values) && f.values.length) {
            return (
              <Select size="small" value={filterFacetValue} onChange={(e) => setFilterFacetValue(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
                <MenuItem value=""><em>Value…</em></MenuItem>
                {f.values.map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
              </Select>
            );
          }
          return (
            <TextField size="small" label="Value" value={filterFacetValue} onChange={(e) => setFilterFacetValue(e.target.value)} />
          );
        })()}
        <Button variant="text" onClick={async () => {
          setQ(''); setFilterFacetId(''); setFilterFacetValue(''); setGender(''); setBrand(''); setPage(1);
          await refetch({ take, skip: 0, where: undefined });
          await refetchVariantCount({ where: undefined });
        }}>Clear</Button>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
          <Button size="small" disabled={!canPrev} onClick={async () => { if (!canPrev) return; const p = Math.max(1, page - 1); setPage(p); await refetch({ take, skip: (p - 1) * take, where }); }}>Prev</Button>
          <Typography variant="body2">Page {page}</Typography>
          <Button size="small" disabled={!canNext} onClick={async () => { if (!canNext) return; const p = page + 1; setPage(p); await refetch({ take, skip: (p - 1) * take, where }); }}>Next</Button>
          <Typography variant="body2" sx={{ ml: 1, minWidth: 110, textAlign: 'right' }}>{total ? `${rangeStart}–${rangeEnd} of ${total}` : '0 of 0'}</Typography>
        </Stack>
      </Stack>
      {selectedIds.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Select size="small" value={bulkFacetId} onChange={(e) => { setBulkFacetId(e.target.value); setBulkValue(''); }} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value=""><em>Select facet…</em></MenuItem>
            {allFacets.map((f) => (<MenuItem key={f.id} value={f.id}>{f.name} ({f.code})</MenuItem>))}
          </Select>
          {(() => {
            const f = allFacets.find((x) => x.id === bulkFacetId);
            if (f && Array.isArray(f.values) && f.values.length) {
              return (
                <Select size="small" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
                  <MenuItem value=""><em>Value…</em></MenuItem>
                  {(f.values || []).map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
                </Select>
              );
            }
            return (<TextField size="small" label="Value" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />);
          })()}
          <Button size="small" variant="contained" disabled={!bulkFacetId || !bulkValue || !selectedIds.length || bulkAssignLoading} onClick={async () => {
            await bulkAssign({ variables: { variantIds: selectedIds as string[], facetId: bulkFacetId, value: bulkValue } });
            clearSelection();
          }}>Assign to selected</Button>
          <Button size="small" color="error" variant="outlined" disabled={!bulkFacetId || !bulkValue || !selectedIds.length || bulkRemoveLoading} onClick={async () => {
            await bulkRemove({ variables: { variantIds: selectedIds as string[], facetId: bulkFacetId, value: bulkValue } });
            clearSelection();
          }}>Remove from selected</Button>
          <Button size="small" onClick={clearSelection}>Clear selection</Button>
        </Stack>
      )}
      <TableList
        columns={[
          { key: 'name', label: 'Name', render: (v: any) => v.name || `${v.size} ${v.concentration} ${v.packaging}`.trim(), sort: true, filter: true, accessor: (v: any) => (v.name || `${v.size || ''} ${v.concentration || ''} ${v.packaging || ''}`).trim() },
          { key: 'product', label: 'Product', render: (v: any) => v.product?.name || '—', sort: true, accessor: (v: any) => v.product?.name || '', filter: true },
          { key: 'tags', label: 'Brand/Gender', render: (v: any) => (<BrandGenderChips variantId={v.id} />) },
          { key: 'barcode', label: 'Barcode', render: (v: any) => v.barcode || '—', sort: true, filter: true },
          { key: 'price', label: 'Price', render: (v: any) => v.price ?? '—', sort: true, accessor: (v: any) => v.price || 0 },
          { key: 'resellerPrice', label: 'Reseller Price', render: (v: any) => v.resellerPrice ?? '—', sort: true, accessor: (v: any) => v.resellerPrice || 0 },
          { key: 'createdAt', label: 'Created', render: (v: any) => new Date(v.createdAt).toLocaleString(), sort: true, accessor: (v: any) => new Date(v.createdAt || 0) },
          { key: 'facets', label: 'Facets', render: (v: any) => (<VariantFacetsChips variantId={v.id} />) },
          ...(isManager ? [{ key: 'actions', label: 'Actions', render: (v: any) => (<VariantFacetsButton variantId={v.id} />) }] as any[] : []),
        ] as any}
        rows={list}
        loading={loading}
        emptyMessage="No variants"
        getRowKey={(v: any) => v.id}
        defaultSortKey="createdAt"
        showFilters
        enableUrlState
        urlKey="variants"
        onRowClick={(v: any) => navigate(`/variants/${v.id}`)}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={(ids) => setSelectedIds(ids)}
      />
    </Stack>
  );
}

function VariantFacetsChips({ variantId }: { variantId: string }) {
  const { data, loading } = useVariantFacetsQuery({ variables: { productVariantId: variantId }, fetchPolicy: 'cache-first' as any });
  const assigns: Array<{ facet: any; value: string }> = data?.variantFacets ?? [];
  if (loading) return null;
  if (!assigns.length) return <>—</>;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
      {assigns.map((a, i) => (<Chip key={`${a.facet?.id}_${a.value}_${i}`} size="small" label={`${a.facet?.code}: ${a.value}`} />))}
    </Stack>
  );
}

function VariantFacetsButton({ variantId }: { variantId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="small" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>Manage Facets</Button>
      {open && <VariantFacetsDialog variantId={variantId} onClose={() => setOpen(false)} />}
    </>
  );
}

function VariantFacetsDialog({ variantId, onClose }: { variantId: string; onClose: () => void }) {
  const { data: facetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const allFacets: Array<{ id: string; name: string; code: string; values?: string[]; isPrivate?: boolean }>
    = facetsData?.listFacets ?? [];
  const { data, refetch } = useVariantFacetsQuery({ variables: { productVariantId: variantId }, fetchPolicy: 'cache-and-network' as any });
  const assigns: Array<{ facet: any; value: string }> = data?.variantFacets ?? [];
  const [assign] = useAssignFacetToVariantMutation();
  const [remove] = useRemoveFacetFromVariantMutation();
  const [selFacetId, setSelFacetId] = React.useState('');
  const [selValue, setSelValue] = React.useState('');
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Variant Facets</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <Select size="small" value={selFacetId} onChange={(e) => { setSelFacetId(e.target.value); setSelValue(''); }} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value=""><em>Select facet…</em></MenuItem>
            {allFacets.map((f) => (<MenuItem key={f.id} value={f.id}>{f.name} ({f.code})</MenuItem>))}
          </Select>
          {(() => {
            const f = allFacets.find((x) => x.id === selFacetId);
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
          <Button size="small" variant="contained" disabled={!selFacetId || !selValue} onClick={async () => {
            await assign({ variables: { productVariantId: variantId, facetId: selFacetId, value: selValue } });
            setSelValue('');
            await refetch();
          }}>Assign</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {assigns.map((a, i) => (
            <Chip key={`${a.facet?.id}_${a.value}_${i}`} label={`${a.facet?.name || a.facet?.code}: ${a.value}`} onDelete={async () => {
              await remove({ variables: { productVariantId: variantId, facetId: a.facet?.id, value: a.value } });
              await refetch();
            }} />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function BrandGenderChips({ variantId }: { variantId: string }) {
  const { data, loading } = useVariantFacetsQuery({ variables: { productVariantId: variantId }, fetchPolicy: 'cache-first' as any });
  if (loading) return null;
  const assigns: Array<{ facet: any; value: string }> = data?.variantFacets ?? [];
  const lower = assigns.map((a) => ({ code: String(a.facet?.code || '').toLowerCase(), value: a.value }));
  const gender = lower.find((x) => x.code === 'gender')?.value;
  const brand = lower.find((x) => x.code === 'brand')?.value;
  if (!gender && !brand) return <>—</>;
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
      {brand && <Chip size="small" label={brand} />}
      {gender && <Chip size="small" label={gender} />}
    </Stack>
  );
}
