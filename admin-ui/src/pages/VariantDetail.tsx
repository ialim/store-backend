import {
  useAssignFacetToVariantMutation,
  useListFacetsQuery,
  useRemoveFacetFromVariantMutation,
  useVariantFacetsQuery,
  useVariantQuery,
  useVariantsQuery,
} from '../generated/graphql';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  Drawer,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import React from 'react';
import { notify } from '../shared/notify';
import { useParams } from 'react-router-dom';

export default function VariantDetail() {
  const params = useParams<{ id?: string }>();
  const id = params.id ?? '';
  const hasId = Boolean(params.id);
  const navigate = useNavigate();
  const auth = useAuth();
  const [openCart, setOpenCart] = React.useState(false);
  const [qty, setQty] = React.useState<number>(1);
  const { data, loading, error } = useVariantQuery({ variables: { id }, skip: !hasId, fetchPolicy: 'cache-and-network' as any });
  const v = data?.findUniqueProductVariant;
  const { data: facetsData, refetch: refetchFacets } = useVariantFacetsQuery({ variables: { productVariantId: id }, skip: !hasId, fetchPolicy: 'cache-first' as any });
  const facets: Array<{
    facet: { id: string; name: string; code: string };
    value: string;
  }> = facetsData?.variantFacets ?? [];
  const { data: allFacetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const allFacets: Array<{
    id: string;
    name: string;
    code: string;
    values?: string[];
  }> = allFacetsData?.listFacets ?? [];
  const [assignFacet] = useAssignFacetToVariantMutation();
  const [removeFacet] = useRemoveFacetFromVariantMutation();
  const [selFacetId, setSelFacetId] = React.useState('');
  const [selValue, setSelValue] = React.useState('');

  if (loading && !v) return null;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!hasId) return <Alert severity="error">Missing variant id.</Alert>;
  if (!v) return <Alert severity="info">Variant not found.</Alert>;

  const title = v.name || v.product?.name || v.barcode || v.id;
  const brand = facets.find(
    (f) => f.facet.code.toLowerCase() === 'brand',
  )?.value;
  const gender = facets.find(
    (f) => f.facet.code.toLowerCase() === 'gender',
  )?.value;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{title}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        {brand && <Chip label={brand} />}
        {gender && <Chip label={gender} />}
        {v.product?.name && <Chip label={v.product.name} />}
      </Stack>
      <Box>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (!auth.token) {
              navigate('/login');
            } else {
              setOpenCart(true);
            }
          }}
        >
          Add to cart
        </Button>
      </Box>
      <Box>
        <Typography color="text.secondary">
          Barcode: {v.barcode || '—'}
        </Typography>
        <Typography color="text.secondary">
          Price: {v.price != null ? v.price.toLocaleString() : '—'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1">Facets</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {facets.length ? (
            facets.map((f, i) => (
              <Chip
                key={`${f.facet.id}_${i}`}
                label={`${f.facet.name || f.facet.code}: ${f.value}`}
                onDelete={async () => {
                  if (!window.confirm(`Remove facet \"${f.facet.name || f.facet.code}\": ${f.value}?`)) return;
                  try {
                    await removeFacet({
                      variables: {
                        productVariantId: id,
                        facetId: f.facet.id,
                        value: f.value,
                      },
                    });
                    notify('Facet removed', 'info');
                    await refetchFacets();
                  } catch (e: any) {
                    notify(e?.message || 'Failed to remove facet', 'error');
                  }
                }}
              />
            ))
          ) : (
            <Typography color="text.secondary">No facets</Typography>
          )}
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mt: 1 }}
        >
          <Select
            size="small"
            value={selFacetId}
            onChange={(e) => {
              setSelFacetId(e.target.value as string);
              setSelValue('');
            }}
            displayEmpty
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">
              <em>Select facet…</em>
            </MenuItem>
            {allFacets.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name} ({f.code})
              </MenuItem>
            ))}
          </Select>
          {(() => {
            const f = allFacets.find((x) => x.id === selFacetId);
            if (f && Array.isArray(f.values) && f.values.length) {
              return (
                <Autocomplete
                  size="small"
                  options={f.values}
                  value={selValue || ''}
                  inputValue={selValue}
                  onInputChange={(_, v) => setSelValue(v)}
                  onChange={(_, v) => setSelValue((v as string) || '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Value" />
                  )}
                  sx={{ minWidth: 180 }}
                  freeSolo
                />
              );
            }
            return (
              <TextField
                size="small"
                label="Value"
                value={selValue}
                onChange={(e) => setSelValue(e.target.value)}
              />
            );
          })()}
          <Button
            size="small"
            variant="contained"
            disabled={!selFacetId || !selValue}
            onClick={async () => {
              try {
                await assignFacet({
                  variables: {
                    productVariantId: id,
                    facetId: selFacetId,
                    value: selValue,
                  },
                });
                notify('Facet assigned', 'success');
                setSelValue('');
                await refetchFacets();
              } catch (e: any) {
                  notify(e?.message || 'Failed to assign facet', 'error');
              }
            }}
          >
            Assign
          </Button>
        </Stack>
      </Box>
      <RelatedVariants currentId={id} brand={brand} gender={gender} />

      <Drawer anchor="right" open={openCart} onClose={() => setOpenCart(false)}>
        <Box sx={{ width: 320, p: 2 }} role="presentation">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Cart</Typography>
            <IconButton onClick={() => setOpenCart(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Item</Typography>
            <Typography>{title}</Typography>
            <Typography color="text.secondary">
              Price: {v.price != null ? v.price.toLocaleString() : '—'}
            </Typography>
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              sx={{ mt: 1, width: 120 }}
            />
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => alert('Checkout coming soon')}
            >
              Checkout
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Stack>
  );
}

function RelatedVariants({
  currentId,
  brand,
  gender,
}: {
  currentId: string;
  brand?: string;
  gender?: string;
}) {
  const where = React.useMemo(() => {
    const w: any = { id: { not: { equals: currentId } } };
    const and: any[] = [];
    if (brand) {
      and.push({
        facets: {
          some: {
            facet: { is: { code: { equals: 'brand' } } },
            value: { equals: brand },
          },
        },
      });
    }
    if (gender) {
      and.push({
        facets: {
          some: {
            facet: { is: { code: { equals: 'gender' } } },
            value: { equals: gender },
          },
        },
      });
    }
    if (and.length) w.AND = and;
    return Object.keys(w).length ? w : undefined;
  }, [currentId, brand, gender]);
  const { data, loading, error } = useVariantsQuery({ variables: { take: 8, where }, skip: !where, fetchPolicy: 'cache-and-network' as any });
  const list: Array<{
    id: string;
    name?: string | null;
    product?: { name?: string | null } | null;
  }> = data?.listProductVariants ?? [];
  if (!where) return null;
  return (
    <Box>
      <Typography variant="subtitle1">Related Variants</Typography>
      {loading && <Typography color="text.secondary">Loading…</Typography>}
      {error && <Alert severity="error">{String(error.message)}</Alert>}
      {!loading && !error && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {list.length ? (
            list.map((rv) => {
              const label = rv.name || rv.product?.name || rv.id;
              return (
                <Chip
                  key={rv.id}
                  label={label}
                  component={Link as any}
                  to={`/variants/${rv.id}`}
                  clickable
                />
              );
            })
          ) : (
            <Typography color="text.secondary">No related variants</Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
