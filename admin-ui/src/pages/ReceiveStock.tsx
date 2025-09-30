import { usePurchaseOrderLazyQuery, useReceiveStockMutation } from '../generated/graphql';
import { Alert, Button, Card, CardContent, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { StoreSelect, UserSelect, VariantSelect } from '../shared/IdSelects';
import { notify } from '../shared/notify';

export default function ReceiveStock() {
  const [purchaseOrderId, setPurchaseOrderId] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [receivedById, setReceivedById] = React.useState('');
  const [confirmedById, setConfirmedById] = React.useState('');
  const [waybillUrl, setWaybillUrl] = React.useState('');
  const [items, setItems] = React.useState<Array<{ productVariantId: string; quantity: number }>>([{ productVariantId: '', quantity: 0 }]);
  const [receive, { loading, error, data }] = useReceiveStockMutation();
  const [loadPO, { loading: loadingPO }] = usePurchaseOrderLazyQuery();

  const setItem = (idx: number, patch: Partial<{ productVariantId: string; quantity: number }>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { productVariantId: '', quantity: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      purchaseOrderId,
      storeId,
      receivedById,
      confirmedById,
      waybillUrl: waybillUrl || null,
      items: items.filter((it) => it.productVariantId && it.quantity > 0),
    };
    const res = await receive({ variables: { input } });
    if (res.data?.receiveStockBatch) notify('Stock received successfully', 'success');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Receive Stock Batch</Typography>
      {error && <Alert severity="error">{error.message}</Alert>}
      {data && <Alert severity="success">Received in store {data.receiveStockBatch.storeId}</Alert>}
      <Card component="form" onSubmit={submit}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField label="Purchase Order ID" fullWidth size="small" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} /></Grid>
            <Grid item xs={12} md={6}><StoreSelect value={storeId} onChange={setStoreId} /></Grid>
            <Grid item xs={12} md={6}><UserSelect value={receivedById} onChange={setReceivedById} label="Received By" /></Grid>
            <Grid item xs={12} md={6}><UserSelect value={confirmedById} onChange={setConfirmedById} label="Confirmed By" /></Grid>
            <Grid item xs={12}><TextField label="Waybill URL (optional)" fullWidth size="small" value={waybillUrl} onChange={(e) => setWaybillUrl(e.target.value)} /></Grid>
          </Grid>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>Items</Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={!purchaseOrderId || loadingPO} onClick={async () => {
                try {
                  const { data: poData } = await loadPO({ variables: { id: purchaseOrderId } });
                  const poItems = poData?.purchaseOrder?.items || [];
                  if (poItems.length) {
                    setItems(poItems.map((it: any) => ({ productVariantId: it.productVariantId, quantity: it.quantity })));
                  } else {
                    notify('No items found on PO', 'info');
                  }
                } catch (e: any) {
                  notify(e?.message || 'Failed to load PO', 'error');
                }
              }}>Load from PO</Button>
              <Button onClick={addItem}>Add Item</Button>
            </Stack>
            {items.map((it, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <VariantSelect value={it.productVariantId} onChange={(v) => setItem(idx, { productVariantId: v })} />
                <TextField label="Qty" type="number" size="small" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) || 0 })} sx={{ width: 120 }} />
                <IconButton onClick={() => removeItem(idx)} aria-label="remove"><DeleteIcon /></IconButton>
              </Stack>
            ))}
          </Stack>
          <Button type="submit" variant="contained" disabled={loading || !purchaseOrderId || !storeId || !receivedById || !confirmedById || !items.length}>Submit</Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
