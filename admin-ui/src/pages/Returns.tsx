import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Button } from '@mui/material';
import { ConfirmButton } from '../shared/Confirm';
import { notify } from '../shared/notify';
import React from 'react';

const SALES_BY_STORE = gql`
  query SalesReturnsByStore($storeId: String!) {
    salesReturnsByStore(storeId: $storeId) { id status createdAt consumerSaleId resellerSaleId }
  }
`;
const PURCHASE_BY_SUPPLIER = gql`
  query PurchaseReturnsBySupplier($supplierId: String!) {
    purchaseReturnsBySupplier(supplierId: $supplierId) { id status createdAt purchaseOrderId supplierId }
  }
`;

const UPDATE_SALES_RETURN = gql`
  mutation UpdateSalesReturn($input: UpdateSalesReturnStatusInput!) { updateSalesReturnStatus(input: $input) }
`;
const FULFILL_PURCHASE_RETURN = gql`
  mutation FulfillPurchaseReturn($input: FulfillPurchaseReturnInput!) { fulfillPurchaseReturn(input: $input) }
`;

export default function Returns() {
  const [storeId, setStoreId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [loadSales, { data: sData, loading: sLoading, error: sError }] = useLazyQuery(SALES_BY_STORE);
  const [loadPurch, { data: pData, loading: pLoading, error: pError }] = useLazyQuery(PURCHASE_BY_SUPPLIER);
  const [updateSalesReturn, { loading: updatingSales }] = useMutation(UPDATE_SALES_RETURN);
  const [fulfillPurchaseReturn, { loading: fulfilling }] = useMutation(FULFILL_PURCHASE_RETURN);
  const sales = sData?.salesReturnsByStore ?? [];
  const purchases = pData?.purchaseReturnsBySupplier ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Returns</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle1">Sales Returns by Store</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField label="Store ID" size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} />
                  <Button variant="contained" onClick={() => storeId && loadSales({ variables: { storeId } })} disabled={!storeId}>Load</Button>
                </Stack>
                {sError && <Alert severity="error">{sError.message}</Alert>}
                {sLoading && !sales.length ? (
                  <>
                    <Skeleton variant="text" width={160} />
                    <Skeleton variant="text" width={220} />
                  </>
                ) : (
                  <Stack spacing={1}>
                    {sales.map((r: any) => (
                      <Card key={r.id}><CardContent>
                        <Typography variant="subtitle2">{r.id}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.status} • {r.consumerSaleId || r.resellerSaleId || ''}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <ConfirmButton variant="outlined" disabled={updatingSales} onConfirm={async () => { await updateSalesReturn({ variables: { input: { id: r.id, status: 'ACCEPTED' } } }); await loadSales({ variables: { storeId } }); notify('Sales return accepted','success'); }}>Accept</ConfirmButton>
                          <ConfirmButton color="error" variant="outlined" disabled={updatingSales} onConfirm={async () => { await updateSalesReturn({ variables: { input: { id: r.id, status: 'REJECTED' } } }); await loadSales({ variables: { storeId } }); notify('Sales return rejected','info'); }}>Reject</ConfirmButton>
                        </Stack>
                      </CardContent></Card>
                    ))}
                    {!sLoading && !sales.length && <Typography color="text.secondary">No returns</Typography>}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="subtitle1">Purchase Returns by Supplier</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField label="Supplier ID" size="small" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
                  <Button variant="contained" onClick={() => supplierId && loadPurch({ variables: { supplierId } })} disabled={!supplierId}>Load</Button>
                </Stack>
                {pError && <Alert severity="error">{pError.message}</Alert>}
                {pLoading && !purchases.length ? (
                  <>
                    <Skeleton variant="text" width={160} />
                    <Skeleton variant="text" width={220} />
                  </>
                ) : (
                  <Stack spacing={1}>
                    {purchases.map((r: any) => (
                      <Card key={r.id}><CardContent>
                        <Typography variant="subtitle2">{r.id}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.status} • PO {r.purchaseOrderId || ''}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <ConfirmButton variant="outlined" disabled={fulfilling} onConfirm={async () => { await fulfillPurchaseReturn({ variables: { input: { id: r.id } } }); await loadPurch({ variables: { supplierId } }); notify('Purchase return fulfilled','success'); }}>Fulfill</ConfirmButton>
                        </Stack>
                      </CardContent></Card>
                    ))}
                    {!pLoading && !purchases.length && <Typography color="text.secondary">No returns</Typography>}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
