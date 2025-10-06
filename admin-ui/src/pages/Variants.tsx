import {
  useListFacetsQuery,
  useProductVariantsCountQuery,
  useVariantFacetsQuery,
  useBulkAssignFacetToVariantsMutation,
  useBulkRemoveFacetFromVariantsMutation,
} from '../generated/graphql';
import { useVariantsQuery } from '../generated/graphql';
import {
  Alert,
  Avatar,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import React from 'react';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';
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

  const currencyFormatter = React.useMemo(() => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
    } catch (err) {
      return null;
    }
  }, []);

  const formatCurrency = React.useCallback(
    (value?: number | null) => {
      if (value == null) return '—';
      if (currencyFormatter) return currencyFormatter.format(value);
      return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },
    [currencyFormatter],
  );

  const dateFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [],
  );

  const getAvailableStock = React.useCallback((variant: any) => {
    if (!Array.isArray(variant?.stockItems) || !variant.stockItems.length) return 0;
    return variant.stockItems.reduce(
      (acc: number, item: any) => acc + (item?.quantity ?? 0) - (item?.reserved ?? 0),
      0,
    );
  }, []);

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
          {
            key: 'sl',
            label: 'SL',
            width: 72,
            align: 'center',
            render: (_variant: any, idx: number) => (
              <Box
                sx={(theme) => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.success.main, 0.14),
                  color: theme.palette.success.dark,
                })}
              >
                {skip + idx + 1}
              </Box>
            ),
          },
          {
            key: 'image',
            label: 'Image',
            width: 96,
            align: 'center',
            render: (variant: any) => {
              const candidates: Array<any> = [
                variant.imageUrl,
                variant.thumbnailUrl,
                typeof variant.image === 'string' ? variant.image : variant.image?.url,
                Array.isArray(variant.images) ? variant.images[0]?.url : undefined,
                Array.isArray(variant.media) ? variant.media[0]?.url : undefined,
                variant.product?.imageUrl,
                variant.product?.thumbnailUrl,
                variant.product && typeof variant.product.image === 'object'
                  ? (variant.product.image as any)?.url
                  : typeof variant.product?.image === 'string'
                    ? variant.product.image
                    : undefined,
              ];
              const imageUrl = candidates.find((src) => typeof src === 'string' && src.length > 0) as string | undefined;
              return (
                <Avatar
                  variant="rounded"
                  src={imageUrl}
                  alt={variant.name || variant.product?.name || 'Variant preview placeholder'}
                  sx={(theme) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                    bgcolor: imageUrl
                      ? '#fff'
                      : alpha(theme.palette.success.main, 0.12),
                    color: theme.palette.success.dark,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiSvgIcon-root': {
                      fontSize: 22,
                    },
                  })}
                >
                  {!imageUrl && <ImageOutlinedIcon />}
                </Avatar>
              );
            },
          },
          {
            key: 'title',
            label: 'Title',
            sort: true,
            filter: true,
            filterPlaceholder: 'Filter title',
            accessor: (variant: any) => variant.name || variant.product?.name || '',
            render: (variant: any) => {
              const primary = variant.name || '—';
              const parent =
                variant.product?.name && variant.product?.name !== variant.name
                  ? variant.product.name
                  : '';
              const initial = typeof primary === 'string' && primary.length ? primary.charAt(0).toUpperCase() : '?';
              return (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    variant="rounded"
                    sx={(theme) => ({
                      width: 44,
                      height: 44,
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      color: theme.palette.success.dark,
                      textTransform: 'uppercase',
                    })}
                  >
                    {initial}
                  </Avatar>
                  <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {primary}
                    </Typography>
                    {parent ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {parent}
                      </Typography>
                    ) : null}
                    <Box sx={{ pt: 0.2 }}>
                      <BrandGenderChips variantId={variant.id} hidePlaceholder />
                    </Box>
                  </Stack>
                </Stack>
              );
            },
          },
          {
            key: 'barcode',
            label: 'Barcode',
            sort: true,
            filter: true,
            accessor: (variant: any) => variant.barcode || '',
            render: (variant: any) => (
              <Typography variant="body2" color="text.secondary">
                {variant.barcode || '—'}
              </Typography>
            ),
          },
          {
            key: 'price',
            label: 'Price',
            align: 'right',
            sort: true,
            filter: true,
            filterPlaceholder: 'Filter price',
            accessor: (variant: any) => variant.price || 0,
            render: (variant: any) => (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(variant.price)}
              </Typography>
            ),
          },
          {
            key: 'stock',
            label: 'Stock',
            align: 'center',
            sort: true,
            filter: true,
            filterPlaceholder: 'Filter stock',
            accessor: (variant: any) => getAvailableStock(variant),
            render: (variant: any) => {
              const available = getAvailableStock(variant);
              return (
                <Typography variant="body2" sx={{ fontWeight: 600, color: available > 0 ? 'success.main' : 'error.main' }}>
                  {available}
                </Typography>
              );
            },
          },
          {
            key: 'status',
            label: 'Status',
            align: 'center',
            sort: true,
            accessor: (variant: any) => getAvailableStock(variant),
            render: (variant: any) => {
              const available = getAvailableStock(variant);
              const active = available > 0;
              return (
                <Chip
                  size="small"
                  label={active ? 'Active' : 'Inactive'}
                  sx={(theme) => ({
                    fontWeight: 600,
                    borderRadius: 1.5,
                    px: 1.5,
                    bgcolor: active
                      ? alpha(theme.palette.success.main, 0.16)
                      : alpha(theme.palette.error.main, 0.16),
                    color: active ? theme.palette.success.dark : theme.palette.error.dark,
                  })}
                />
              );
            },
          },
          {
            key: 'createdAt',
            label: 'Created',
            align: 'right',
            sort: true,
            accessor: (variant: any) => new Date(variant.createdAt || 0),
            render: (variant: any) => (
              <Typography variant="body2" color="text.secondary">
                {variant.createdAt ? dateFormatter.format(new Date(variant.createdAt)) : '—'}
              </Typography>
            ),
          },
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
        size="medium"
        paginated={false}
        rowAccent={(variant: any) => {
          const available = getAvailableStock(variant);
          if (available <= 0) return 'danger';
          if (available < 5) return 'warning';
          return 'default';
        }}
        actions={{
          view: {
            onClick: (variant: any) => navigate(`/variants/${variant.id}`),
            label: 'View variant detail',
          },
        }}
      />
    </Stack>
  );
}

function BrandGenderChips({ variantId, hidePlaceholder = false }: { variantId: string; hidePlaceholder?: boolean }) {
  const { data, loading } = useVariantFacetsQuery({ variables: { productVariantId: variantId }, fetchPolicy: 'cache-first' as any });
  if (loading) return null;
  const assigns: Array<{ facet: any; value: string }> = data?.variantFacets ?? [];
  const lower = assigns.map((a) => ({ code: String(a.facet?.code || '').toLowerCase(), value: a.value }));
  const gender = lower.find((x) => x.code === 'gender')?.value;
  const brand = lower.find((x) => x.code === 'brand')?.value;
  if (!gender && !brand) {
    return hidePlaceholder ? null : <>—</>;
  }
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
      {brand && <Chip size="small" label={brand} />}
      {gender && <Chip size="small" label={gender} />}
    </Stack>
  );
}
