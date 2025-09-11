import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Button,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';

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

const STORES = gql`
  query StoresForPayments { listStores(take: 200) { id name } }
`;

const STORE_SUMMARY_RANGE = gql`
  query StorePaymentsSummaryRange($storeId: String!, $start: DateTime!, $end: DateTime!) {
    storePaymentsSummaryRange(storeId: $storeId, start: $start, end: $end) {
      storeId
      month
      consumerPaid
      resellerPaid
      totalPaid
    }
  }
`;

const DAILY_SERIES_RANGE = gql`
  query DailyPaymentsSeriesRange($start: DateTime!, $end: DateTime!, $storeId: String) {
    dailyPaymentsSeriesRange(start: $start, end: $end, storeId: $storeId) {
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
  const [start, setStart] = React.useState<string>('');
  const [end, setEnd] = React.useState<string>('');
  const [showChart, setShowChart] = React.useState<boolean>(true);
  const { data: storesData } = useQuery(STORES, { fetchPolicy: 'cache-first' });
  const stores = storesData?.listStores ?? [];
  const {
    data: summary,
    loading: loadingSummary,
    error: errorSummary,
    refetch: refetchSummary,
  } = useQuery(STORE_SUMMARY, {
    variables: { storeId: storeId || '', month: month || null },
    skip: !storeId || !!(start && end),
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: summaryRange,
    loading: loadingSummaryRange,
    error: errorSummaryRange,
    refetch: refetchSummaryRange,
  } = useQuery(STORE_SUMMARY_RANGE, {
    variables: { storeId: storeId || '', start: start ? new Date(start) : undefined, end: end ? new Date(end) : undefined },
    skip: !storeId || !(start && end),
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: series,
    loading: loadingSeries,
    error: errorSeries,
    refetch: refetchSeries,
  } = useQuery(DAILY_SERIES, {
    variables: { month: month || null, storeId: storeId || null },
    skip: !storeId || !!(start && end),
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: seriesRange,
    loading: loadingSeriesRange,
    error: errorSeriesRange,
    refetch: refetchSeriesRange,
  } = useQuery(DAILY_SERIES_RANGE, {
    variables: { start: start ? new Date(start) : undefined, end: end ? new Date(end) : undefined, storeId: storeId || null },
    skip: !storeId || !(start && end),
    fetchPolicy: 'cache-and-network',
  });

  const s = (start && end ? summaryRange?.storePaymentsSummaryRange : summary?.storePaymentsSummary);
  const list = (start && end ? seriesRange?.dailyPaymentsSeriesRange : series?.dailyPaymentsSeries) ?? [];
  const loadingAny = (start && end) ? (loadingSummaryRange || loadingSeriesRange) : (loadingSummary || loadingSeries);
  const errorAny = (start && end) ? (errorSummaryRange || errorSeriesRange) : (errorSummary || errorSeries);
  const rangeInvalid = (!!start && !!end && new Date(start) > new Date(end)) || (!!start && !end) || (!start && !!end);

  const Chart = ({ data }: { data: any[] }) => {
    if (!data?.length)
      return <Typography color="text.secondary">No data</Typography>;
    const w = 520;
    const h = 120;
    const pad = 24;
    const xs = data.map((_, i) => i);
    const ys = data.map((d) => Number(d.totalPaid || 0));
    const maxY = Math.max(...ys, 1);
    const scaleX = (i: number) =>
      pad + (i * (w - 2 * pad)) / Math.max(xs.length - 1, 1);
    const scaleY = (v: number) => h - pad - (v * (h - 2 * pad)) / maxY;
    const path = ys
      .map((y, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(y)}`)
      .join(' ');
    return (
      <svg width={w} height={h} style={{ width: '100%', maxWidth: w }}>
        <rect x={0} y={0} width={w} height={h} fill="transparent" />
        <path d={path} stroke="#1976d2" fill="none" strokeWidth={2} />
      </svg>
    );
  };

  const exportDailyCsv = (rowsToUse?: any[]) => {
    const source = rowsToUse && rowsToUse.length ? rowsToUse : list;
    if (!source?.length) return;
    const header = ['date', 'consumerPaid', 'resellerPaid', 'totalPaid'];
    const rows = source.map((d: any) => [d.date, d.consumerPaid, d.resellerPaid, d.totalPaid]);
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = (start && end) ? `${start}_to_${end}` : (month || 'current');
    a.download = `daily-payments-${storeId || 'store'}-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Payments</Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <Select
          size="small"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          displayEmpty
          sx={{ minWidth: 260 }}
        >
          <MenuItem value=""><em>Select store…</em></MenuItem>
          {stores.map((s: any) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </Select>
        <TextField
          label="Month (YYYY-MM)"
          size="small"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={!!(start || end)}
        />
        <TextField
          label="Start"
          type="date"
          size="small"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={!!month}
        />
        <TextField
          label="End"
          type="date"
          size="small"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={!!month}
        />
        <Button
          variant="contained"
          onClick={() => {
            if (start && end) {
              refetchSummaryRange();
              refetchSeriesRange();
            } else {
              refetchSummary();
              refetchSeries();
            }
          }}
          disabled={!storeId || rangeInvalid}
        >
          Refresh
        </Button>
        {/* Export handled in TableList toolbar */}
        <FormControlLabel control={<Switch checked={showChart} onChange={(e) => setShowChart(e.target.checked)} />} label="Show Chart" />
      </Stack>
      {rangeInvalid && (
        <Alert severity="warning">Please select both Start and End dates, and ensure Start is before or equal to End.</Alert>
      )}
      {errorAny && (
        <Alert severity="error">
          {errorSummary?.message || errorSeries?.message || errorSummaryRange?.message || errorSeriesRange?.message}
        </Alert>
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
                  <Typography color="text.secondary">
                    Month: {s.month || 'current'}
                  </Typography>
                  <Typography>Consumer Paid: {formatMoney(s.consumerPaid)}</Typography>
                  <Typography>Reseller Paid: {formatMoney(s.resellerPaid)}</Typography>
                  <Typography>
                    <b>Total Paid: {formatMoney(s.totalPaid)}</b>
                  </Typography>
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
              {loadingAny && !list.length ? (
                <>
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="text" width={240} />
                </>
              ) : (
                <>
                  {showChart && <Chart data={list} />}
                  <TableList
                    columns={[
                      { key: 'date', label: 'Date', sort: true, accessor: (r: any) => new Date(r.date) },
                      { key: 'consumerPaid', label: 'Consumer', sort: true, render: (r: any) => formatMoney(r.consumerPaid) },
                      { key: 'resellerPaid', label: 'Reseller', sort: true, render: (r: any) => formatMoney(r.resellerPaid) },
                      { key: 'totalPaid', label: 'Total', sort: true, render: (r: any) => formatMoney(r.totalPaid) },
                    ] as any}
                    rows={list}
                    loading={loadingAny}
                    emptyMessage={storeId ? 'No payments for selected month' : 'Enter Store ID'}
                    getRowKey={(r: any) => r.date}
                    defaultSortKey="date"
                    rowsPerPageOptions={[15, 30, 60]}
                    defaultRowsPerPage={30}
                    showFilters
                    globalSearch
                    globalSearchPlaceholder="Search by date"
                    globalSearchKeys={['date']}
                    enableUrlState
                    urlKey="payments_daily"
                    onExport={({ sorted }) => exportDailyCsv(sorted as any[])}
                    exportScopeControl
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
