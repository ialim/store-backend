import { useMonthlySalesSummaryByStoreQuery, useMonthlySalesSummaryQuery, useTopSellingVariantsByStoreQuery, useTopSellingVariantsDetailedQuery } from '../generated/graphql';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Button } from '@mui/material';
import React from 'react';


export default function Analytics() {
  const [storeId, setStoreId] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [limit, setLimit] = React.useState(10);

  const varsSummary: any = storeId ? { storeId, month: month || null } : { month: month || null };
  const { data: sum, loading: loadingSum, error: errorSum, refetch: refetchSum } = (
    storeId
      ? useMonthlySalesSummaryByStoreQuery({ variables: varsSummary, fetchPolicy: 'cache-and-network' as any })
      : useMonthlySalesSummaryQuery({ variables: varsSummary, fetchPolicy: 'cache-and-network' as any })
  );

  const varsTop: any = storeId ? { storeId, month: month || null, limit } : { month: month || null, limit };
  const { data: top, loading: loadingTop, error: errorTop, refetch: refetchTop } = (
    storeId
      ? useTopSellingVariantsByStoreQuery({ variables: varsTop, fetchPolicy: 'cache-and-network' as any })
      : useTopSellingVariantsDetailedQuery({ variables: varsTop, fetchPolicy: 'cache-and-network' as any })
  );

  // TypeScript union from conditional hook makes `sum`/`top` a union of two result shapes.
  // Cast to any for concise access to either field name.
  const s = (sum as any)?.monthlySalesSummary ?? (sum as any)?.monthlySalesSummaryByStore;
  const list = ((top as any)?.topSellingVariantsDetailed ?? (top as any)?.topSellingVariantsByStore) ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Analytics</Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="Store ID (optional)" size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        <TextField label="Month (YYYY-MM)" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
        <TextField label="Top N" type="number" size="small" value={limit} onChange={(e) => setLimit(Number(e.target.value) || 10)} sx={{ width: 120 }} />
        <Button variant="contained" onClick={() => { refetchSum(); refetchTop(); }}>Refresh</Button>
      </Stack>
      {(errorSum || errorTop) && (
        <Alert severity="error">{errorSum?.message || errorTop?.message}</Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Monthly Summary</Typography>
              {loadingSum ? (
                <>
                  <Skeleton variant="text" width={160} />
                  <Skeleton variant="text" width={200} />
                </>
              ) : s ? (
                <Stack>
                  <Typography color="text.secondary">Month: {s.month || 'current'}</Typography>
                  <Typography>Total Sold (units): {s.totalSold}</Typography>
                  <Typography>Total Returned (units): {s.totalReturned}</Typography>
                </Stack>
              ) : (
                <Typography color="text.secondary">Enter filters and refresh</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Top Variants</Typography>
              {loadingTop && !list.length ? (
                <>
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="text" width={260} />
                </>
              ) : (
                <Stack spacing={1}>
                  {list.map((v: any) => (
                    <Card key={v.productVariantId}><CardContent>
                      <Typography variant="subtitle2">{v.productName || v.productVariantId} {v.size || ''} {v.concentration || ''} {v.packaging || ''}</Typography>
                      <Typography variant="caption" color="text.secondary">Units: {v.quantity}</Typography>
                    </CardContent></Card>
                  ))}
                  {!loadingTop && !list.length && (
                    <Typography color="text.secondary">No data</Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
