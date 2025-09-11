import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Button } from '@mui/material';
import { ConfirmButton } from '../shared/Confirm';
import TableList from '../shared/TableList';
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
  const exportSalesCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : sales;
    if (!rowsToUse?.length) return;
    const header = ['id','status','createdAt','saleId'];
    const rows = rowsToUse.map((r: any) => [r.id, r.status, r.createdAt, r.consumerSaleId || r.resellerSaleId || '']);
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sales-returns-${storeId || 'store'}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const exportPurchCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : purchases;
    if (!rowsToUse?.length) return;
    const header = ['id','status','createdAt','purchaseOrderId','supplierId'];
    const rows = rowsToUse.map((r: any) => [r.id, r.status, r.createdAt, r.purchaseOrderId || '', r.supplierId || '']);
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `purchase-returns-${supplierId || 'supplier'}.csv`; a.click(); URL.revokeObjectURL(url);
  };
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
                  <TableList
                    columns={[
                      { key: 'id', label: 'ID', sort: true },
                      { key: 'status', label: 'Status', sort: true },
                      { key: 'sale', label: 'Sale', render: (r: any) => r.consumerSaleId || r.resellerSaleId || '—' },
                      { key: 'actions', label: 'Actions', render: (r: any) => (
                        <Stack direction="row" spacing={1}>
                          <ConfirmButton variant="outlined" disabled={updatingSales} onConfirm={async () => { await updateSalesReturn({ variables: { input: { id: r.id, status: 'ACCEPTED' } } }); await loadSales({ variables: { storeId } }); notify('Sales return accepted','success'); }}>Accept</ConfirmButton>
                          <ConfirmButton color="error" variant="outlined" disabled={updatingSales} onConfirm={async () => { await updateSalesReturn({ variables: { input: { id: r.id, status: 'REJECTED' } } }); await loadSales({ variables: { storeId } }); notify('Sales return rejected','info'); }}>Reject</ConfirmButton>
                        </Stack>
                      ) },
                    ] as any}
                    rows={sales}
                    loading={sLoading}
                    emptyMessage={storeId ? 'No returns' : 'Enter Store ID'}
                    getRowKey={(r: any) => r.id}
                    showFilters
                    globalSearch
                    globalSearchPlaceholder="Search returns"
                    enableUrlState
                    urlKey="returns_sales"
                    onExport={exportSalesCsv}
                    exportScopeControl
                  />
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
                  <TableList
                    columns={[
                      { key: 'id', label: 'ID', sort: true },
                      { key: 'status', label: 'Status', sort: true },
                      { key: 'po', label: 'PO', render: (r: any) => r.purchaseOrderId || '—' },
                      { key: 'actions', label: 'Actions', render: (r: any) => (
                        <ConfirmButton variant="outlined" disabled={fulfilling} onConfirm={async () => { await fulfillPurchaseReturn({ variables: { input: { id: r.id } } }); await loadPurch({ variables: { supplierId } }); notify('Purchase return fulfilled','success'); }}>Fulfill</ConfirmButton>
                      ) },
                    ] as any}
                    rows={purchases}
                    loading={pLoading}
                    emptyMessage={supplierId ? 'No returns' : 'Enter Supplier ID'}
                    getRowKey={(r: any) => r.id}
                    showFilters
                    globalSearch
                    globalSearchPlaceholder="Search purchase returns"
                    enableUrlState
                    urlKey="returns_purchase"
                    onExport={exportPurchCsv}
                    exportScopeControl
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
