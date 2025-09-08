import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, CircularProgress, Skeleton, Stack, TextField, Typography, FormControlLabel, Switch } from '@mui/material';
import { useEffect, useState } from 'react';

const CANDIDATES = gql`
  query LowStock($storeId: String, $limit: Int) {
    lowStockCandidates(storeId: $storeId, limit: $limit) {
      storeId storeName productVariantId productId productName size concentration packaging barcode
      quantity reorderPoint reorderQty supplierId supplierName supplierDefaultCost supplierLeadTimeDays supplierIsPreferred supplierCount
    }
  }
`;

const RUN_SCAN = gql`
  mutation RunScan { runLowStockScanNow }
`;

export default function LowStock() {
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const { data, loading, error, refetch } = useQuery(CANDIDATES, { variables: { storeId, limit: 100 } });
  const [runScan, { loading: scanning }] = useMutation(RUN_SCAN);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalSec, setIntervalSec] = useState(15);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(async () => {
      await refetch();
    }, Math.max(5, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec, refetch]);

  const doScan = async () => {
    setMsg(null);
    setErr(null);
    try {
      await runScan();
      setMsg('Triggered low-stock scan');
      await refetch();
    } catch (e: any) {
      setErr(e?.message || 'Failed to trigger scan');
    }
  };

  const list = data?.lowStockCandidates ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Low Stock</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {(error || err) && (
        <Alert severity="error">{error?.message || err}</Alert>
      )}
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField label="Store ID (optional)" value={storeId ?? ''} onChange={e => setStoreId(e.target.value || undefined)} size="small" />
        <Button variant="contained" onClick={() => refetch()} disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button variant="outlined" onClick={doScan} disabled={scanning} startIcon={scanning ? <CircularProgress size={16} /> : undefined}>
          {scanning ? 'Scanning…' : 'Run Scan Now'}
        </Button>
        <FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />} label={`Auto Refresh (${intervalSec}s)`} />
        <TextField label="Interval" type="number" size="small" value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value) || 15)} inputProps={{ min: 5, style: { width: 80 } }} />
        {error && (
          <Button variant="text" onClick={() => refetch()}>Retry</Button>
        )}
      </Stack>
      <Stack spacing={1}>
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </CardContent></Card>
            ))}
          </>
        )}
        {!loading && list.map((c: any) => (
          <Card key={`${c.storeId}:${c.productVariantId}`}>
            <CardContent>
              <Typography variant="subtitle1">{c.productName || c.productVariantId}</Typography>
              <Typography variant="body2" color="text.secondary">
                Store: {c.storeName || c.storeId} • Qty: {c.quantity} • ReorderPoint: {c.reorderPoint} • ReorderQty: {c.reorderQty}
              </Typography>
              {c.supplierName && (
                <Typography variant="body2" color="text.secondary">
                  Supplier: {c.supplierName} • Cost: {c.supplierDefaultCost} • Lead: {c.supplierLeadTimeDays}d {c.supplierIsPreferred ? '• Preferred' : ''}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
