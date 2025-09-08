import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

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
  const { data, loading, refetch } = useQuery(CANDIDATES, { variables: { storeId, limit: 100 } });
  const [runScan, { loading: scanning }] = useMutation(RUN_SCAN);
  const [msg, setMsg] = useState<string | null>(null);

  const doScan = async () => {
    setMsg(null);
    await runScan();
    setMsg('Triggered low-stock scan');
    await refetch();
  };

  const list = data?.lowStockCandidates ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Low Stock</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Store ID (optional)" value={storeId ?? ''} onChange={e => setStoreId(e.target.value || undefined)} size="small" />
        <Button variant="contained" onClick={() => refetch()}>Refresh</Button>
        <Button variant="outlined" onClick={doScan} disabled={scanning}>Run Scan Now</Button>
      </Stack>
      <Stack spacing={1}>
        {loading && <Typography>Loading…</Typography>}
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

