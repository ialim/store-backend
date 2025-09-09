import { gql, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Button } from '@mui/material';
import React from 'react';

const SUMMARY = gql`
  query MonthlySalesSummary($month: String) {
    monthlySalesSummary(month: $month) {
      month
      totalSold
      totalReturned
    }
  }
`;

const SUMMARY_BY_STORE = gql`
  query MonthlySalesSummaryByStore($storeId: String!, $month: String) {
    monthlySalesSummaryByStore(storeId: $storeId, month: $month) {
      month
      totalSold
      totalReturned
    }
  }
`;

const TOP_VARIANTS = gql`
  query TopVariants($month: String, $limit: Int) {
    topSellingVariantsDetailed(month: $month, limit: $limit) {
      productVariantId
      productName
      size
      concentration
      packaging
      quantity
      barcode
    }
  }
`;

const TOP_VARIANTS_BY_STORE = gql`
  query TopVariantsByStore($storeId: String!, $month: String, $limit: Int) {
    topSellingVariantsByStore(storeId: $storeId, month: $month, limit: $limit) {
      productVariantId
      productName
      size
      concentration
      packaging
      quantity
      barcode
    }
  }
`;

export default function Analytics() {
  const [storeId, setStoreId] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [limit, setLimit] = React.useState(10);

  const summaryQuery = storeId ? SUMMARY_BY_STORE : SUMMARY;
  const varsSummary: any = storeId ? { storeId, month: month || null } : { month: month || null };
  const { data: sum, loading: loadingSum, error: errorSum, refetch: refetchSum } = useQuery(summaryQuery, { variables: varsSummary, fetchPolicy: 'cache-and-network' });

  const topQuery = storeId ? TOP_VARIANTS_BY_STORE : TOP_VARIANTS;
  const varsTop: any = storeId ? { storeId, month: month || null, limit } : { month: month || null, limit };
  const { data: top, loading: loadingTop, error: errorTop, refetch: refetchTop } = useQuery(topQuery, { variables: varsTop, fetchPolicy: 'cache-and-network' });

  const s = sum?.monthlySalesSummary || sum?.monthlySalesSummaryByStore;
  const list = (top?.topSellingVariantsDetailed || top?.topSellingVariantsByStore) ?? [];

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
