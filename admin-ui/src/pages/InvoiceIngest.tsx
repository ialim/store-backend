import { gql, useMutation } from '@apollo/client';
import { useCreateInvoiceImportMutation, useStoresQuery } from '../generated/graphql';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';
import { useAuth } from '../shared/AuthProvider';
// Compute API base robustly even if VITE_GRAPHQL_URL is relative (e.g. "/graphql")
const GRAPHQL_URL = (import.meta as any).env.VITE_GRAPHQL_URL || '/graphql';
const API_BASE = (import.meta as any).env.VITE_API_BASE || (() => {
  try {
    const abs = new URL(GRAPHQL_URL, window.location.origin);
    return abs.origin;
  } catch {
    return window.location.origin;
  }
})();

const AdminProcessInvoiceUrlDocument = gql`
  mutation AdminProcessInvoiceUrl($input: ProcessInvoiceUrlInput!) {
    adminProcessInvoiceUrl(input: $input) {
      status
      message
      supplierId
      supplierName
      invoiceNumber
      purchaseOrderId
      totalAmount
      lines {
        description
        qty
        unitPrice
        discountPct
        discountedUnitPrice
        lineTotal
        variantId
      }
    }
  }
`;

export default function InvoiceIngest() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [url, setUrl] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [createPO, setCreatePO] = React.useState(true);
  const [createPayment, setCreatePayment] = React.useState(false);
  const [receiveStock, setReceiveStock] = React.useState(false);
  const [receivedById, setReceivedById] = React.useState('');
  const [confirmedById, setConfirmedById] = React.useState('');
  const { data: storesData } = useStoresQuery({ variables: { take: 200 }, fetchPolicy: 'cache-first' as any });
  const stores = storesData?.listStores ?? [];
  const [process, { data, loading, error }] = useMutation(AdminProcessInvoiceUrlDocument);
  const [createImport] = useCreateInvoiceImportMutation();
  const res = data?.adminProcessInvoiceUrl;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Invoice Ingest (URL)</Typography>
      <Card><CardContent>
        <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
          <TextField label="Invoice URL (text/PDF with text)" fullWidth value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button component="label" variant="outlined" size="small">
            Upload File
            <input hidden type="file" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              try {
                const headers: HeadersInit = token
                  ? { Authorization: `Bearer ${token}` }
                  : {};
                const res = await fetch(`${API_BASE}/uploads/invoices`, {
                  method: 'POST',
                  body: fd,
                  headers,
                });
                const json = await res.json();
                const invoiceUri = json?.url || json?.uri;
                if (invoiceUri) {
                  setUrl(invoiceUri);
                  // Persist as an Invoice Import and navigate to detail for review/approval
                  try {
                    const result = await createImport({ variables: { input: { url: invoiceUri, storeId: storeId || null } } });
                    const id = result.data?.adminCreateInvoiceImport?.id;
                    if (id) navigate(`/invoice-imports/${id}`);
                  } catch {}
                }
              } catch {}
            }} />
          </Button>
          <Select size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} displayEmpty sx={{ minWidth: 240 }}>
            <MenuItem value=""><em>Choose store (optional)</em></MenuItem>
            {stores.map((s: any) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
          </Select>
          <FormControlLabel control={<Switch checked={createPO} onChange={(e) => setCreatePO(e.target.checked)} />} label="Create PO" />
          <FormControlLabel control={<Switch checked={createPayment} onChange={(e) => setCreatePayment(e.target.checked)} />} label="Create Payment" />
          <FormControlLabel control={<Switch checked={receiveStock} onChange={(e) => setReceiveStock(e.target.checked)} />} label="Receive Stock" />
          {receiveStock && (
            <>
              <TextField size="small" label="Received By ID" value={receivedById} onChange={(e) => setReceivedById(e.target.value)} />
              <TextField size="small" label="Confirmed By ID" value={confirmedById} onChange={(e) => setConfirmedById(e.target.value)} />
            </>
          )}
          <Button variant="contained" disabled={!url || loading} onClick={async () => {
            await process({ variables: { input: { url, storeId: storeId || null, createPurchaseOrder: createPO, createSupplierPayment: createPayment, receiveStock, receivedById: receivedById || null, confirmedById: confirmedById || null } } });
          }}>{loading ? 'Processing…' : 'Process'}</Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error.message}</Alert>}
      </CardContent></Card>

      {res && (
        <Card><CardContent>
          <Typography variant="subtitle1">Result</Typography>
          <Box sx={{ mb: 1 }}>
            <Typography color="text.secondary">Status: {res.status} {res.message ? `— ${res.message}` : ''}</Typography>
            <Typography color="text.secondary">Supplier: {res.supplierName || res.supplierId || '—'}</Typography>
            <Typography color="text.secondary">Invoice #: {res.invoiceNumber || '—'}</Typography>
            <Typography color="text.secondary">PO: {res.purchaseOrderId || '—'}</Typography>
            <Typography color="text.secondary">Total: {res.totalAmount ?? '—'}</Typography>
          </Box>
          <TableList
            columns={[
              { key: 'description', label: 'Item', filter: true, sort: true },
              { key: 'qty', label: 'Qty', sort: true },
              { key: 'unitPrice', label: 'Unit', sort: true },
              { key: 'discountPct', label: 'Disc %', sort: true },
              { key: 'discountedUnitPrice', label: 'Disc Unit', sort: true },
              { key: 'lineTotal', label: 'Line Total', sort: true },
              { key: 'variantId', label: 'Variant ID' },
            ] as any}
            rows={res.lines || []}
            loading={false}
            emptyMessage="No lines"
            getRowKey={(_: any, i: number) => i}
            defaultSortKey="lineTotal"
            showFilters
            globalSearch
            globalSearchPlaceholder="Search lines"
            enableUrlState
            urlKey="invoice_ingest_preview"
          />
        </CardContent></Card>
      )}
    </Stack>
  );
}
