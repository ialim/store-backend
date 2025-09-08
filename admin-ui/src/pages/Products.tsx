import { gql, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography } from '@mui/material';
import React from 'react';

const PRODUCTS = gql`
  query Products($take: Int) { listProducts(take: $take) { id name barcode categoryId } }
`;

export default function Products() {
  const [take, setTake] = React.useState(20);
  const { data, loading, error, refetch } = useQuery(PRODUCTS, { variables: { take }, fetchPolicy: 'cache-and-network' });
  const list = data?.listProducts ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Products</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 20)} sx={{ width: 120 }} />
      </Stack>
      <Grid container spacing={2}>
        {loading && !list.length
          ? [...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card><CardContent>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </CardContent></Card>
              </Grid>
            ))
          : list.map((p: any) => (
              <Grid item xs={12} sm={6} md={3} key={p.id}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{p.name || p.id}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.barcode || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>
    </Stack>
  );
}

