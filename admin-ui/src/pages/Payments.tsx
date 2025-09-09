import { gql, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Button } from '@mui/material';
import React from 'react';

const STORE_SUMMARY = gql`
  query StorePaymentsSummary($storeId: String!, $month: String) {
    storePaymentsSummary(storeId: $storeId, month: $month) {
      storeId
      month
      consumerPaid
      resellerPaid
      totalPaid
    }
  }
`;

const DAILY_SERIES = gql`
  query DailyPaymentsSeries($month: String, $storeId: String) {
    dailyPaymentsSeries(month: $month, storeId: $storeId) {
      date
      consumerPaid
      resellerPaid
      totalPaid
    }
  }
`;

export default function Payments() {
  const [storeId, setStoreId] = React.useState('');
  const [month, setMonth] = React.useState<string>('');
  const { data: summary, loading: loadingSummary, error: errorSummary, refetch: refetchSummary } = useQuery(STORE_SUMMARY, {
    variables: { storeId: storeId || '1', month: month || null },
    skip: !storeId,
    fetchPolicy: 'cache-and-network',
  });
  const { data: series, loading: loadingSeries, error: errorSeries, refetch: refetchSeries } = useQuery(DAILY_SERIES, {
    variables: { month: month || null, storeId: storeId || null },
    skip: !storeId,
    fetchPolicy: 'cache-and-network',
  });

  const s = summary?.storePaymentsSummary;
  const list = series?.dailyPaymentsSeries ?? [];

  const Chart = ({ data }: { data: any[] }) => {
    if (!data?.length) return <Typography color="text.secondary">No data</Typography>;
    const w = 520; const h = 120; const pad = 24;
    const xs = data.map((_, i) => i);
    const ys = data.map((d) => Number(d.totalPaid || 0));
    const maxY = Math.max(...ys, 1);
    const scaleX = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(xs.length - 1, 1);
    const scaleY = (v: number) => h - pad - (v * (h - 2 * pad)) / maxY;
    const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(y)}`).join(' ');
    return (
      <svg width={w} height={h} style={{ width: '100%', maxWidth: w }}>
        <rect x={0} y={0} width={w} height={h} fill="transparent" />
        <path d={path} stroke="#1976d2" fill="none" strokeWidth={2} />
      </svg>
    );
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Payments</Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="Store ID" size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        <TextField label="Month (YYYY-MM)" size="small" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Button variant="contained" onClick={() => { refetchSummary(); refetchSeries(); }} disabled={!storeId}>Refresh</Button>
      </Stack>
      {(errorSummary || errorSeries) && (
        <Alert severity="error">{errorSummary?.message || errorSeries?.message}</Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Store Summary</Typography>
              {loadingSummary ? (
                <>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={180} />
                </>
              ) : s ? (
                <Stack>
                  <Typography color="text.secondary">Month: {s.month || 'current'}</Typography>
                  <Typography>Consumer Paid: {s.consumerPaid}</Typography>
                  <Typography>Reseller Paid: {s.resellerPaid}</Typography>
                  <Typography><b>Total Paid: {s.totalPaid}</b></Typography>
                </Stack>
              ) : (
                <Typography color="text.secondary">Enter Store ID</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Daily Payments</Typography>
              {loadingSeries && !list.length ? (
                <>
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="text" width={240} />
                </>
              ) : (
                <>
                  <Chart data={list} />
                  <Stack spacing={0.5}>
                    {list.map((d: any) => (
                      <Typography key={d.date} variant="body2" color="text.secondary">
                        {d.date}: {d.totalPaid} (C {d.consumerPaid} / R {d.resellerPaid})
                      </Typography>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
