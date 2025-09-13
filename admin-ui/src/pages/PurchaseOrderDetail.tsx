import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Checkbox, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import { StoreSelect, UserSelect } from '../shared/IdSelects';
import { notify } from '../shared/notify';
import { formatMoney } from '../shared/format';

const PO = gql`
  query PurchaseOrder($id: String!) {
    purchaseOrder(id: $id) {
      id supplierId status phase totalAmount createdAt supplier { id name }
      items { productVariantId quantity unitCost productVariant { id name barcode size concentration packaging product { name } } }
    }
    purchaseOrderReceiptProgress(purchaseOrderId: $id) {
      productVariantId orderedQty receivedQty
    }
  }
`;

const RECEIVE = gql`
  mutation ReceiveStock($input: ReceiveStockBatchInput!) {
    receiveStockBatch(input: $input) { id storeId }
  }
`;

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useQuery(PO, { variables: { id }, fetchPolicy: 'network-only' });
  const [receive, { loading: receiving }] = useMutation(RECEIVE);

  const [storeId, setStoreId] = React.useState('');
  const [receivedById, setReceivedById] = React.useState('');
  const [confirmedById, setConfirmedById] = React.useState('');
  const [rows, setRows] = React.useState<Array<{ selected: boolean; variantId: string; toReceive: number; ordered: number; received: number }>>([]);

  React.useEffect(() => {
    const items = data?.purchaseOrder?.items || [];
    const progress = new Map<string, { ordered: number; received: number }>();
    (data?.purchaseOrderReceiptProgress || []).forEach((p: any) => progress.set(p.productVariantId, { ordered: p.orderedQty, received: p.receivedQty }));
    setRows(items.map((it: any) => ({ selected: false, variantId: it.productVariantId, toReceive: it.quantity, ordered: progress.get(it.productVariantId)?.ordered ?? it.quantity, received: progress.get(it.productVariantId)?.received ?? 0 })));
  }, [data]);

  const setRow = (idx: number, patch: Partial<{ selected: boolean; toReceive: number }>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const submitReceive = async () => {
    const items = rows.filter((r) => r.selected && r.variantId && r.toReceive > 0).map((r) => ({ productVariantId: r.variantId, quantity: r.toReceive }));
    if (!items.length) return notify('Select at least one item with quantity', 'warning');
    if (!storeId || !receivedById || !confirmedById) return notify('Select store and users', 'warning');
    try {
      await receive({ variables: { input: { purchaseOrderId: id!, storeId, receivedById, confirmedById, items } } });
      notify('Stock received for selected items', 'success');
      await refetch();
    } catch (e: any) {
      notify(e?.message || 'Failed to receive stock', 'error');
    }
  };

  const po = data?.purchaseOrder;
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Purchase Order {id}</Typography>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle1">Summary</Typography>
            {loading ? (
              <Typography color="text.secondary">Loading…</Typography>
            ) : po ? (
              <Stack>
                <Typography color="text.secondary">Supplier: {po.supplier?.name || po.supplierId}</Typography>
                <Typography color="text.secondary">Status: {po.status} • Phase: {po.phase || '—'}</Typography>
                <Typography color="text.secondary">Created: {new Date(po.createdAt).toLocaleString()}</Typography>
                <Typography>Total: {po.totalAmount == null ? '—' : formatMoney(po.totalAmount)}</Typography>
              </Stack>
            ) : null}
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle1">Receive Selected</Typography>
            <Stack spacing={1}>
              <StoreSelect value={storeId} onChange={setStoreId} />
              <UserSelect value={receivedById} onChange={setReceivedById} label="Received By" />
              <UserSelect value={confirmedById} onChange={setConfirmedById} label="Confirmed By" />
              <Box>
                <Button variant="contained" disabled={receiving} onClick={submitReceive}>Receive Selected</Button>
              </Box>
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Items</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"><Checkbox disabled /></TableCell>
                <TableCell>Variant</TableCell>
                <TableCell>Ordered Qty</TableCell>
                <TableCell>Received So Far</TableCell>
                <TableCell>Remaining</TableCell>
                <TableCell>Receive Qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(po?.items ?? []).map((it: any, idx: number) => (
                <TableRow key={it.productVariantId} hover>
                  <TableCell padding="checkbox">
                    <Checkbox checked={rows[idx]?.selected || false} onChange={(e) => setRow(idx, { selected: e.target.checked })} />
                  </TableCell>
                  <TableCell>{it.productVariant?.name || it.productVariant?.product?.name || it.productVariant?.barcode || it.productVariantId}</TableCell>
                  <TableCell>{rows[idx]?.ordered ?? it.quantity}</TableCell>
                  <TableCell>{rows[idx]?.received ?? 0}</TableCell>
                  <TableCell>{Math.max(0, (rows[idx]?.ordered ?? it.quantity) - (rows[idx]?.received ?? 0))}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={rows[idx]?.toReceive ?? it.quantity}
                      onChange={(e) => {
                        const max = Math.max(0, (rows[idx]?.ordered ?? it.quantity) - (rows[idx]?.received ?? 0));
                        let val = Number(e.target.value) || 0;
                        if (val > max) val = max;
                        if (val < 0) val = 0;
                        setRow(idx, { toReceive: val });
                      }}
                      sx={{ width: 120 }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
