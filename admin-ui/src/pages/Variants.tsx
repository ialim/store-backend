import {
  useAssignFacetToVariantMutation,
  useListFacetsQuery,
  useProductVariantsCountQuery,
  useVariantFacetsQuery,
  useRemoveFacetFromVariantMutation,
  useBulkAssignFacetToVariantsMutation,
  useBulkRemoveFacetFromVariantsMutation,
} from '../generated/graphql';
import { useVariantsQuery } from '../generated/graphql';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import React from 'react';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';
import { ListingHero, ListingSelectionCard } from '../shared/ListingLayout';


export default function Variants() {
  const auth = useAuth();
  const isManager =
    auth.hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || auth.hasPermission('MANAGE_PRODUCTS');
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
    const sq = q.trim();
    const filters: any = {};
    if (sq.length >= 2) {
      filters.OR = [
        { name: { contains: sq, mode: 'insensitive' } },
        { barcode: { contains: sq, mode: 'insensitive' } },
        { product: { is: { name: { contains: sq, mode: 'insensitive' } } } },
      ];
    }
    if (filterFacetId && filterFacetValue) {
      const facet = allFacets.find((f) => f.id === filterFacetId);
      if (facet) {
        filters.AND = (filters.AND || []).concat({
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
      filters.AND = (filters.AND || []).concat({
        facets: {
          some: {
            facet: { is: { code: { equals: 'gender' } } },
            value: { equals: gender },
          },
        },
      });
    }
    if (brand) {
      filters.AND = (filters.AND || []).concat({
        facets: {
          some: {
            facet: { is: { code: { equals: 'brand' } } },
            value: { equals: brand },
          },
        },
      });
    }
    return Object.keys(filters).length ? filters : undefined;
  }, [q, filterFacetId, filterFacetValue, allFacets, gender, brand]);
  const skip = Math.max(0, (page - 1) * take);
  const { data, loading, error, refetch } = useVariantsQuery({
    variables: { take, skip, where },
    fetchPolicy: 'cache-and-network' as any,
  });
  const { data: countData, refetch: refetchVariantCount } = useProductVariantsCountQuery({
    variables: { where },
    fetchPolicy: 'cache-and-network' as any,
  });
  const list = data?.listProductVariants ?? [];
  const total = countData?.productVariantsCount ?? 0;
  const canPrev = page > 1;
  const canNext = skip + list.length < total;
  const rangeStart = total > 0 ? Math.min(total, skip + 1) : 0;
  const rangeEnd = total > 0 ? Math.min(total, skip + list.length) : 0;

  React.useEffect(() => {
    if (total === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / take));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [total, take, page]);
  // Debounced search on text input; rely on where dependency
  React.useEffect(() => {
    const h = setTimeout(async () => {
      setPage(1);
      await refetch({ take, skip: 0, where });
      await refetchVariantCount({ where });
    }, 300);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterFacetId, filterFacetValue, gender, brand]);

  // Selection for bulk operations via TableList API
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);
  const clearSelection = () => setSelectedIds([]);

  // Bulk facet assign/remove
  const [bulkFacetId, setBulkFacetId] = React.useState('');
  const [bulkValue, setBulkValue] = React.useState('');
  const [bulkAssign, { loading: bulkAssignLoading }] = useBulkAssignFacetToVariantsMutation();
  const [bulkRemove, { loading: bulkRemoveLoading }] = useBulkRemoveFacetFromVariantsMutation();
  const [facetsVariantId, setFacetsVariantId] = React.useState<string | null>(null);

  const filtersRow = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      sx={{ flexWrap: 'wrap' }}
    >
      <Select
        size="small"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        displayEmpty
        sx={{ minWidth: 160, borderRadius: 999 }}
      >
        <MenuItem value="">
          <em>Gender</em>
        </MenuItem>
        {(allFacets.find((f) => f.code.toLowerCase() === 'gender')?.values || ['Male', 'Female', 'Unisex']).map((v) => (
          <MenuItem key={v} value={v}>
            {v}
          </MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        displayEmpty
        sx={{ minWidth: 160, borderRadius: 999 }}
      >
        <MenuItem value="">
          <em>Brand</em>
        </MenuItem>
        {(allFacets.find((f) => f.code.toLowerCase() === 'brand')?.values || []).map((v) => (
          <MenuItem key={v} value={v}>
            {v}
          </MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={filterFacetId}
        onChange={(e) => {
          setFilterFacetId(e.target.value);
          setFilterFacetValue('');
        }}
        displayEmpty
        sx={{ minWidth: 200, borderRadius: 999 }}
      >
        <MenuItem value="">
          <em>Facet filter…</em>
        </MenuItem>
        {allFacets.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name} ({f.code})
          </MenuItem>
        ))}
      </Select>
      {(() => {
        const f = allFacets.find((x) => x.id === filterFacetId);
        if (f && Array.isArray(f.values) && f.values.length) {
          return (
            <Select
              size="small"
              value={filterFacetValue}
              onChange={(e) => setFilterFacetValue(e.target.value)}
              displayEmpty
              sx={{ minWidth: 180, borderRadius: 999 }}
            >
              <MenuItem value="">
                <em>Value…</em>
              </MenuItem>
              {f.values.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          );
        }
        if (filterFacetId) {
          return (
            <TextField
              size="small"
              label="Value"
              value={filterFacetValue}
              onChange={(e) => setFilterFacetValue(e.target.value)}
            />
          );
        }
        return null;
      })()}
      <Button
        size="small"
        variant="text"
        onClick={async () => {
          setQ('');
          setFilterFacetId('');
          setFilterFacetValue('');
          setGender('');
          setBrand('');
          setPage(1);
          await refetch({ take, skip: 0, where: undefined });
          await refetchVariantCount({ where: undefined });
        }}
      >
        Clear
      </Button>
    </Stack>
  );

  const paginationRow = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{ rowGap: 1.5 }}
    >
      <Typography variant="body2" color="text.secondary">
        {total ? `${rangeStart}–${rangeEnd} of ${total}` : 'No variants found'}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          disabled={!canPrev}
          onClick={async () => {
            if (!canPrev) return;
            const nextPage = Math.max(1, page - 1);
            setPage(nextPage);
            const newSkip = (nextPage - 1) * take;
            await refetch({ take, skip: newSkip, where });
          }}
        >
          Prev
        </Button>
        <Typography variant="body2">Page {page}</Typography>
        <Button
          size="small"
          disabled={!canNext}
          onClick={async () => {
            if (!canNext) return;
            const nextPage = page + 1;
            setPage(nextPage);
            const newSkip = (nextPage - 1) * take;
            await refetch({ take, skip: newSkip, where });
          }}
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
  const toolbarSx = {
    px: { xs: 1.25, sm: 1.5, md: 2 },
    py: { xs: 1, sm: 1.25 },
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    boxShadow: 1,
  } as const;

  const pageSizeOptions = React.useMemo(() => {
    const presets = [10, 25, 50, 100];
    if (presets.includes(take)) return presets;
    return [...presets, take].sort((a, b) => a - b);
  }, [take]);

  const handleTakeChange = React.useCallback(
    async (next: number) => {
      const safeValue = Math.max(1, Number.isFinite(next) ? next : 50);
      setPage(1);
      setTake(safeValue);
      try {
        await refetch({ take: safeValue, skip: 0, where });
        await refetchVariantCount({ where });
      } catch (err) {
        console.error('Failed to update page size', err);
      }
    },
    [refetch, refetchVariantCount, where],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Variants</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack spacing={1.25}>
        <Box sx={toolbarSx}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search variants"
              label="Search (name/sku/barcode/product)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  void refetch({ take, skip: 0, where });
                  void refetchVariantCount({ where });
                }
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: { md: 200 } }}>
              <Typography variant="body2" color="text.secondary">
                Show
              </Typography>
              <Select
                size="small"
                value={take}
                onChange={(event) => {
                  void handleTakeChange(Number(event.target.value));
                }}
                sx={{ minWidth: 96, borderRadius: 999 }}
              >
                {pageSizeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary">
                per page
              </Typography>
            </Stack>
          </Stack>
        </Box>
        <Box sx={toolbarSx}>{filtersRow}</Box>
        <Box sx={toolbarSx}>{paginationRow}</Box>
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
          <Button
            size="small"
            variant="contained"
            disabled={!bulkFacetId || !bulkValue || !selectedIds.length || bulkAssignLoading}
            onClick={async () => {
              try {
                await bulkAssign({
                  variables: {
                    variantIds: selectedIds as string[],
                    facetId: bulkFacetId,
                    value: bulkValue,
                  },
                });
                notify('Facet assigned to selected variants', 'success');
                clearSelection();
                await refetch({ take, skip, where });
                await refetchVariantCount({ where });
              } catch (err: any) {
                notify(err?.message || 'Failed to assign facet to selected variants', 'error');
              }
            }}
          >
            Assign to selected
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={!bulkFacetId || !bulkValue || !selectedIds.length || bulkRemoveLoading}
            onClick={async () => {
              try {
                await bulkRemove({
                  variables: {
                    variantIds: selectedIds as string[],
                    facetId: bulkFacetId,
                    value: bulkValue,
                  },
                });
                notify('Facet removed from selected variants', 'success');
                clearSelection();
                await refetch({ take, skip, where });
                await refetchVariantCount({ where });
              } catch (err: any) {
                notify(err?.message || 'Failed to remove facet from selected variants', 'error');
              }
            }}
          >
            Remove from selected
          </Button>
          <Button size="small" onClick={clearSelection}>Clear selection</Button>
        </Stack>
      )}
      <TableList
        columns={[
          { key: 'name', label: 'Name', render: (v: any) => v.name || v.product?.name || v.barcode || '—', sort: true, filter: true, accessor: (v: any) => v.name || v.product?.name || v.barcode || '' },
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
          <Button
            size="small"
            variant="contained"
            disabled={!selFacetId || !selValue}
            onClick={async () => {
              try {
                await assign({
                  variables: {
                    productVariantId: variantId,
                    facetId: selFacetId,
                    value: selValue,
                  },
                });
                notify('Facet assigned', 'success');
                setSelValue('');
                await refetch();
              } catch (err: any) {
                notify(err?.message || 'Failed to assign facet', 'error');
              }
            }}
          >
            Assign
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {assigns.map((a, i) => (
            <Chip
              key={`${a.facet?.id}_${a.value}_${i}`}
              label={`${a.facet?.name || a.facet?.code}: ${a.value}`}
              onDelete={async () => {
                try {
                  await remove({
                    variables: {
                      productVariantId: variantId,
                      facetId: a.facet?.id,
                      value: a.value,
                    },
                  });
                  notify('Facet removed', 'success');
                  await refetch();
                } catch (err: any) {
                  notify(err?.message || 'Failed to remove facet', 'error');
                }
              }}
            />
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
