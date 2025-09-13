import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { useParams } from 'react-router-dom';

const VARIANT = gql`
  query Variant($id: String!) {
    findUniqueProductVariant(where: { id: $id }) {
      id
      name
      barcode
      size
      concentration
      packaging
      price
      resellerPrice
      createdAt
      product { id name }
    }
  }
`;

const VARIANT_FACETS = gql`
  query($productVariantId: String!) {
    variantFacets(productVariantId: $productVariantId) { facet { id name code } value }
  }
`;

export default function VariantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(VARIANT, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const v = data?.findUniqueProductVariant;
  const { data: facetsData } = useQuery(VARIANT_FACETS, { variables: { productVariantId: id as string }, skip: !id, fetchPolicy: 'cache-first' });
  const facets: Array<{ facet: { id: string; name: string; code: string }; value: string }> = facetsData?.variantFacets ?? [];

  if (loading && !v) return null;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!v) return <Alert severity="info">Variant not found.</Alert>;

  const title = v.name || `${v.size || ''} ${v.concentration || ''} ${v.packaging || ''}`.trim() || v.barcode || v.id;
  const brand = facets.find((f) => f.facet.code.toLowerCase() === 'brand')?.value;
  const gender = facets.find((f) => f.facet.code.toLowerCase() === 'gender')?.value;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{title}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        {brand && <Chip label={brand} />}
        {gender && <Chip label={gender} />}
        {v.product?.name && (<Chip label={v.product.name} />)}
      </Stack>
      <Box>
        <Button variant="contained" color="primary" onClick={() => alert('Add to cart coming soon')}>Add to cart</Button>
      </Box>
      <Box>
        <Typography color="text.secondary">Barcode: {v.barcode || '—'}</Typography>
        <Typography color="text.secondary">Size: {v.size || '—'}</Typography>
        <Typography color="text.secondary">Concentration: {v.concentration || '—'}</Typography>
        <Typography color="text.secondary">Packaging: {v.packaging || '—'}</Typography>
        <Typography color="text.secondary">Price: {v.price != null ? v.price.toLocaleString() : '—'}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1">Facets</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {facets.length ? facets.map((f, i) => (<Chip key={`${f.facet.id}_${i}`} label={`${f.facet.name || f.facet.code}: ${f.value}`} />)) : <Typography color="text.secondary">No facets</Typography>}
        </Stack>
      </Box>
      <RelatedVariants currentId={id as string} brand={brand} gender={gender} />
    </Stack>
  );
}

const RELATED = gql`
  query RelatedVariants($take: Int, $where: ProductVariantWhereInput) {
    listProductVariants(take: $take, where: $where) {
      id
      name
      size
      concentration
      packaging
      product { id name }
    }
  }
`;

function RelatedVariants({ currentId, brand, gender }: { currentId: string; brand?: string; gender?: string }) {
  const where = React.useMemo(() => {
    const w: any = { id: { not: currentId } };
    const and: any[] = [];
    if (brand) {
      and.push({ facets: { some: { facet: { code: { equals: 'brand' } }, value: { equals: brand } } } });
    }
    if (gender) {
      and.push({ facets: { some: { facet: { code: { equals: 'gender' } }, value: { equals: gender } } } });
    }
    if (and.length) w.AND = and;
    return Object.keys(w).length ? w : undefined;
  }, [currentId, brand, gender]);
  const { data, loading, error } = useQuery(RELATED, { variables: { take: 8, where }, skip: !where, fetchPolicy: 'cache-and-network' });
  const list: Array<{ id: string; name?: string; size?: string; concentration?: string; packaging?: string; product?: { name?: string } }> = data?.listProductVariants ?? [];
  if (!where) return null;
  return (
    <Box>
      <Typography variant="subtitle1">Related Variants</Typography>
      {loading && <Typography color="text.secondary">Loading…</Typography>}
      {error && <Alert severity="error">{String(error.message)}</Alert>}
      {!loading && !error && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          {list.length ? list.map((rv) => {
            const label = rv.name || [rv.size, rv.concentration, rv.packaging].filter(Boolean).join(' ') || rv.product?.name || rv.id;
            return <Chip key={rv.id} label={label} component={Link as any} to={`/variants/${rv.id}`} clickable />;
          }) : <Typography color="text.secondary">No related variants</Typography>}
        </Stack>
      )}
    </Box>
  );
}
