import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
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
    </Stack>
  );
}

