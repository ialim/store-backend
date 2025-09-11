import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Select, MenuItem, Stack, TextField, Typography, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TableList from '../shared/TableList';

const GET = gql`
  query InvoiceImport($id: String!) {
    invoiceImport(id: $id) {
      id
      url
      supplierName
      storeId
      status
      message
      createdAt
      parsed
    }
  }
`;

const STORES = gql`query StoresForImportDetail { listStores(take: 200) { id name } }`;

const APPROVE = gql`
  mutation ApproveInvoiceImport($input: ApproveInvoiceImportInput!) {
    adminApproveInvoiceImport(input: $input) { id status message }
  }
`;

const REPROCESS = gql`
  mutation ReprocessInvoiceImport($id: String!) {
    adminReprocessInvoiceImport(id: $id) { id status message parsed }
  }
`;

export default function InvoiceImportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const skip = !id;
  const { data, loading, error, refetch } = useQuery(GET, { variables: { id: id as string }, skip, fetchPolicy: 'cache-and-network' });
  const { data: storesData } = useQuery(STORES, { fetchPolicy: 'cache-first' });
  const [approve, { loading: approving, error: approveError }] = useMutation(APPROVE);
  const [reprocess, { loading: reprocessing, error: reprocessError }] = useMutation(REPROCESS);
  const item = data?.invoiceImport;
  const stores = storesData?.listStores ?? [];

  const [supplierName, setSupplierName] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [createPO, setCreatePO] = React.useState(true);
  const [createPayment, setCreatePayment] = React.useState(false);
  const [receiveStock, setReceiveStock] = React.useState(false);
  const [useParsedTotal, setUseParsedTotal] = React.useState(false);
  const [receivedById, setReceivedById] = React.useState('');
  const [confirmedById, setConfirmedById] = React.useState('');
  const [showRaw, setShowRaw] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      const parsedSupplier = (item.parsed && (item.parsed as any).supplierName) || '';
      setSupplierName(item.supplierName || parsedSupplier || '');
      setStoreId(item.storeId || '');
      const pt = Number((item.parsed as any)?.total) || 0;
      setUseParsedTotal(pt > 0);
    }
  }, [item?.id]);

  if (!id) return <Alert severity="warning">Invalid import id.</Alert>;
  if (loading && !item) return <CircularProgress size={24} />;
  if (!item) return <Alert severity="warning">Import not found.</Alert>;

  const lines = Array.isArray(item.parsed?.lines) ? item.parsed.lines : [];
  const rawText: string = (item.parsed && (item.parsed as any).rawText) || '';
  const parsedTotal = Number((item.parsed as any)?.total) || 0;
  const computedTotal = lines.reduce((s: number, ln: any) => {
    const q = Number(ln.qty) || 1;
    const unit = ln.discountedUnitPrice ?? ln.unitPrice ?? (ln.lineTotal != null ? Number(ln.lineTotal) / q : 0);
    const tot = ln.lineTotal != null ? Number(ln.lineTotal) : Number(unit) * q;
    return s + (isFinite(tot) ? tot : 0);
  }, 0);
  const diff = computedTotal - parsedTotal;
  const fmt = (n: number) => isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  React.useEffect(() => {
    if (!item) return;
    if (item.status !== 'PROCESSING' && item.status !== 'PENDING') return;
    const t = setInterval(() => { refetch(); }, 3000);
    return () => clearInterval(t);
  }, [item?.id, item?.status]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ flex: 1 }}>Invoice Import</Typography>
        <Button size="small" onClick={() => navigate('/invoice-imports')}>Back</Button>
      </Stack>
      <Card><CardContent>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField size="small" label="Invoice URL" value={item.url || ''} InputProps={{ readOnly: true }} fullWidth />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="Supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            <Select size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
              <MenuItem value=""><em>Store (optional)</em></MenuItem>
              {stores.map((s: any) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
            </Select>
            <FormControlLabel control={<Switch checked={createPO} onChange={(e) => setCreatePO(e.target.checked)} />} label="Create PO" />
            <FormControlLabel control={<Switch checked={createPayment} onChange={(e) => setCreatePayment(e.target.checked)} />} label="Create Payment" />
            <FormControlLabel control={<Switch checked={receiveStock} onChange={(e) => setReceiveStock(e.target.checked)} />} label="Receive Stock" />
            <FormControlLabel control={<Switch checked={useParsedTotal} onChange={(e) => setUseParsedTotal(e.target.checked)} />} label="Use Parsed Total" />
            {receiveStock && (
              <>
                <TextField size="small" label="Received By ID" value={receivedById} onChange={(e) => setReceivedById(e.target.value)} />
                <TextField size="small" label="Confirmed By ID" value={confirmedById} onChange={(e) => setConfirmedById(e.target.value)} />
              </>
            )}
            <Button variant="outlined" disabled={reprocessing} onClick={async () => { await reprocess({ variables: { id } }); await refetch(); }}>{reprocessing ? 'Reprocessing…' : 'Reprocess'}</Button>
            <Button variant="contained" disabled={!item.url || approving} onClick={async () => {
              await approve({ variables: { input: { id, supplierName: supplierName || null, storeId: storeId || null, createPurchaseOrder: createPO, createSupplierPayment: createPayment, receiveStock, receivedById: receivedById || null, confirmedById: confirmedById || null, useParsedTotal } } });
              await refetch();
            }}>{approving ? 'Approving…' : 'Approve'}</Button>
          </Stack>
          {Math.abs(diff) > 0.5 && (
            <Alert severity="warning">Invoice totals differ by ₦{fmt(diff)}. Toggle "Use Parsed Total" if needed.</Alert>
          )}
          {error && <Alert severity="error">{String(error.message)}</Alert>}
          {approveError && <Alert severity="error">{String(approveError.message)}</Alert>}
          {reprocessError && <Alert severity="error">{String(reprocessError.message)}</Alert>}
          <Box>
            <Typography color="text.secondary">Status: {item.status} {item.message ? `— ${item.message}` : ''}</Typography>
            <Typography color="text.secondary">Created: {new Date(item.createdAt).toLocaleString()}</Typography>
            <Typography color="text.secondary">Invoice #: {(item.parsed as any)?.invoiceNumber || '—'}</Typography>
            <Typography color="text.secondary">Totals — Parsed: ₦{fmt(parsedTotal)} | Lines: ₦{fmt(computedTotal)} | Diff: ₦{fmt(diff)}</Typography>
          </Box>
          {(item.status === 'PROCESSING' || item.status === 'PENDING') && (
            <Typography color="text.secondary">Processing… this page will auto-refresh.</Typography>
          )}
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Parsed Lines</Typography>
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
          rows={lines}
          loading={loading}
          emptyMessage="No lines"
          getRowKey={(_: any, i: number) => i}
          defaultSortKey="lineTotal"
          showFilters
          globalSearch
          globalSearchPlaceholder="Search lines"
          enableUrlState
          urlKey={`invoice_import_${id}`}
        />
      </CardContent></Card>

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Raw Text (debug)</Typography>
            <FormControlLabel control={<Switch checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />} label="Show" />
          </Stack>
          {showRaw && (
            <Box component="pre" sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.100', maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {rawText || '— No raw text captured —'}
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
