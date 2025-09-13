import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Select, MenuItem, Stack, TextField, Typography, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import { UserSelect } from '../shared/IdSelects';
import { notify } from '../shared/notify';
import { useAuth } from '../shared/AuthProvider';
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
    adminApproveInvoiceImport(input: $input) {
      purchaseOrderId
      invoiceImport { id status message }
    }
  }
`;

const REPROCESS = gql`
  mutation ReprocessInvoiceImport($id: String!) {
    adminReprocessInvoiceImport(id: $id) { id status message parsed }
  }
`;

const UPDATE = gql`
  mutation UpdateInvoiceImport($input: UpdateInvoiceImportInput!) {
    adminUpdateInvoiceImport(input: $input) { id url supplierName storeId parsed }
  }
`;

const SEARCH_POS = gql`
  query PurchaseOrdersSearch($q: String!) { purchaseOrdersSearch(q: $q) { id invoiceNumber supplier { id name } } }
`;

export default function InvoiceImportDetail() {
  const auth = useAuth();
  const canManage = auth.hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || auth.hasPermission('MANAGE_PRODUCTS','VIEW_REPORTS');
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
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [createPO, setCreatePO] = React.useState(true);
  const [createPayment, setCreatePayment] = React.useState(false);
  const [receiveStock, setReceiveStock] = React.useState(false);
  const [useParsedTotal, setUseParsedTotal] = React.useState(false);
  const [receivedById, setReceivedById] = React.useState('');
  const [confirmedById, setConfirmedById] = React.useState('');
  const [showRaw, setShowRaw] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState(false);
  const [draftLines, setDraftLines] = React.useState<any[]>([]);
  const [localUrl, setLocalUrl] = React.useState('');
  const [updateImport, { loading: updating }] = useMutation(UPDATE);
  const [searchPOs, searchPO] = useLazyQuery(SEARCH_POS);

  // Compute API base to resolve relative URLs like "/uploads/..." against the backend, not the Vite dev origin
  const GRAPHQL_URL = (import.meta as any).env.VITE_GRAPHQL_URL || '/graphql';
  const API_BASE = (import.meta as any).env.VITE_API_BASE || (() => {
    try { return new URL(GRAPHQL_URL, window.location.origin).origin; } catch { return window.location.origin; }
  })();

  React.useEffect(() => {
    if (item) {
      const parsedSupplier = (item?.parsed as any)?.supplierName || '';
      setSupplierName(item.supplierName || parsedSupplier || '');
      setStoreId(item.storeId || '');
      setInvoiceNumber(((item?.parsed as any)?.invoiceNumber || '') as string);
      const pt = Number(item?.parsed?.total ?? 0);
      setUseParsedTotal(pt > 0);
    }
  }, [item?.id]);
  React.useEffect(() => { setLocalUrl(item?.url || ''); }, [item?.id]);
  React.useEffect(() => {
    const ls = Array.isArray(item?.parsed?.lines) ? (item?.parsed?.lines as any[]) : [];
    setDraftLines(ls.map((l: any) => ({ ...l })));
  }, [item?.id]);

  // Auto-refresh while processing, but keep hook order stable regardless of item
  React.useEffect(() => {
    if (!item) return;
    if (item.status !== 'PROCESSING' && item.status !== 'PENDING') return;
    const t = setInterval(() => { refetch(); }, 3000);
    return () => clearInterval(t);
  }, [item?.id, item?.status, refetch]);

  if (!id) return <Alert severity="warning">Invalid import id.</Alert>;
  if (loading && !item) return <CircularProgress size={24} />;
  if (!item) return <Alert severity="warning">Import not found.</Alert>;

  const lines = Array.isArray(item?.parsed?.lines) ? (item?.parsed?.lines as any[]) : [];
  const rawText: string = ((item?.parsed as any)?.rawText) || '';
  const parsedTotal = Number(item?.parsed?.total ?? 0);
  const computedTotal = lines.reduce((s: number, ln: any) => {
    const q = Number(ln.qty) || 1;
    const unit = ln.unitPrice ?? (ln.lineTotal != null ? Number(ln.lineTotal) / q : 0);
    const tot = ln.lineTotal != null ? Number(ln.lineTotal) : Number(unit) * q;
    return s + (isFinite(tot) ? tot : 0);
  }, 0);
  const diff = computedTotal - parsedTotal;
  const fmt = (n: number) => isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  // interval refresh hook moved above early returns to preserve hook order

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ flex: 1 }}>Invoice Import</Typography>
        <Button size="small" onClick={() => navigate('/invoice-imports')}>Back</Button>
      </Stack>
      <Card><CardContent>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField size="small" label="Invoice URL" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)} fullWidth />
            <TextField size="small" label="Invoice #" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            <Button size="small" variant="outlined" disabled={updating || !canManage} onClick={async () => { await updateImport({ variables: { input: { id, url: localUrl } } }); await refetch(); notify('Invoice URL updated','success'); }}>Save URL</Button>
            <Button size="small" variant="outlined" disabled={updating || !canManage} onClick={async () => { await updateImport({ variables: { input: { id, supplierName: supplierName || null, storeId: storeId || null, invoiceNumber: invoiceNumber || null } } }); await refetch(); notify('Details updated','success'); }}>Save Details</Button>
            <Button size="small" variant="text" disabled={!canManage} onClick={() => setEdit((v) => !v)}>{edit ? 'Done Editing' : 'Edit Lines'}</Button>
            {edit && (
              <>
                <Button size="small" onClick={() => setDraftLines((arr) => [...arr, { description: '', qty: 1 }])}>Add Row</Button>
                <Button size="small" onClick={() => setDraftLines(Array.isArray(item?.parsed?.lines) ? (item?.parsed?.lines as any[]).map((l: any) => ({ ...l })) : [])}>Discard Edits</Button>
                <Button size="small" onClick={() => setDraftLines((arr) => arr.map((l: any) => {
                  const q = Number(l.qty) || 1;
                  const unit = (l.discountedUnitPrice ?? l.unitPrice ?? 0);
                  const lineTotal = (l.lineTotal == null || isNaN(l.lineTotal)) ? +(q * unit).toFixed(2) : l.lineTotal;
                  const discountedUnitPrice = (l.discountedUnitPrice == null && l.discountPct != null && l.unitPrice != null)
                    ? +(l.unitPrice * (1 - l.discountPct / 100)).toFixed(2)
                    : l.discountedUnitPrice;
                  return { ...l, discountedUnitPrice, lineTotal };
                }))}>Recalculate</Button>
              </>
            )}
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
            <Button size="small" variant="outlined" disabled={updating || !canManage} onClick={async () => {
              await updateImport({ variables: { input: { id, supplierName: supplierName || null, storeId: storeId || null, invoiceNumber: invoiceNumber || null } } });
              await refetch();
              notify('Details updated','success');
            }}>Save Details</Button>
            {receiveStock && (
              <>
                <Box sx={{ minWidth: 260 }}><UserSelect value={receivedById} onChange={setReceivedById} label="Received By" placeholder="Search email" /></Box>
                <Box sx={{ minWidth: 260 }}><UserSelect value={confirmedById} onChange={setConfirmedById} label="Confirmed By" placeholder="Search email" /></Box>
              </>
            )}
            <Button variant="outlined" disabled={reprocessing || !canManage} onClick={async () => { await reprocess({ variables: { id } }); notify('Reprocessing started','info'); await refetch(); }}>{reprocessing ? 'Reprocessing…' : 'Reprocess'}</Button>
            <Button variant="contained" disabled={!item.url || approving || !canManage} onClick={() => setOpen(true)}>{approving ? 'Approving…' : 'Approve'}</Button>
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
            <Typography color="text.secondary">Invoice #: {(item?.parsed as any)?.invoiceNumber || invoiceNumber || '—'}</Typography>
            <Typography color="text.secondary">Totals — Parsed: ₦{fmt(parsedTotal)} | Lines: ₦{fmt(computedTotal)} | Diff: ₦{fmt(diff)}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={async () => {
                const q = String((item?.parsed as any)?.invoiceNumber || supplierName || '').trim();
                if (!q) return;
                await searchPOs({ variables: { q } });
              }}>Find PO</Button>
              {!!searchPO.data?.purchaseOrdersSearch?.[0]?.id && (
                <Button size="small" variant="contained" onClick={() => navigate(`/purchase-orders/${searchPO.data.purchaseOrdersSearch[0].id}`)}>View PO</Button>
              )}
            </Stack>
          </Box>
          {(item.status === 'PROCESSING' || item.status === 'PENDING') && (
            <Typography color="text.secondary">Processing… this page will auto-refresh.</Typography>
          )}
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">Invoice Preview</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {localUrl && (() => { const u = localUrl.startsWith('/') ? `${API_BASE}${localUrl}` : localUrl; return (<Button size="small" href={u} target="_blank" rel="noopener noreferrer">Open</Button>); })()}
            <FormControlLabel control={<Switch checked={showPreview} onChange={(e) => setShowPreview(e.target.checked)} />} label="Show" />
          </Stack>
        </Stack>
        {showPreview && localUrl && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: 480 }}>
            {(() => {
              const resolved = localUrl.startsWith('/') ? `${API_BASE}${localUrl}` : localUrl;
              const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(resolved);
              if (isImage) {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'grey.50' }}>
                    <img src={resolved} alt="Invoice" style={{ maxWidth: '100%', maxHeight: '100%' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  </Box>
                );
              }
              // Fallback to iframe for PDFs and all other URLs (may be cross-origin)
              return (<iframe src={resolved} width="100%" height="100%" title="Invoice Preview" style={{ border: 0 }} />);
            })()}
          </Box>
        )}
        {showPreview && localUrl && (
          <Typography variant="caption" color="text.secondary">If the preview is blank, click Open — some sites block embedding.</Typography>
        )}
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Parsed Lines</Typography>
        <TableList
          columns={[
            { key: 'description', label: 'Item', filter: true, sort: true, render: (r: any, i: number) => edit ? (
              <TextField size="small" value={draftLines[i]?.description || ''} onChange={(e) => setDraftLines((arr) => { const next = [...arr]; next[i] = { ...next[i], description: e.target.value }; return next; })} />
            ) : (r.description) },
            { key: 'barcode', label: 'Barcode', filter: true, sort: true, render: (r: any, i: number) => edit ? (
              <TextField size="small" value={draftLines[i]?.barcode || ''} onChange={(e) => setDraftLines((arr) => { const next = [...arr]; next[i] = { ...next[i], barcode: e.target.value }; return next; })} />
            ) : (r.barcode || '—') },
            { key: 'qty', label: 'Qty', sort: true, render: (r: any, i: number) => edit ? (
              <TextField size="small" type="number" value={draftLines[i]?.qty ?? ''} onChange={(e) => setDraftLines((arr) => { const next = [...arr]; next[i] = { ...next[i], qty: e.target.value === '' ? undefined : parseFloat(e.target.value) }; return next; })} />
            ) : (r.qty) },
            { key: 'unitPrice', label: 'Unit', sort: true, render: (r: any, i: number) => edit ? (
              <TextField size="small" type="number" value={draftLines[i]?.unitPrice ?? ''} onChange={(e) => setDraftLines((arr) => { const next = [...arr]; next[i] = { ...next[i], unitPrice: e.target.value === '' ? undefined : parseFloat(e.target.value) }; return next; })} />
            ) : (r.unitPrice) },
            { key: 'lineTotal', label: 'Line Total', sort: true, render: (r: any, i: number) => edit ? (
              <TextField size="small" type="number" value={draftLines[i]?.lineTotal ?? ''} onChange={(e) => setDraftLines((arr) => { const next = [...arr]; next[i] = { ...next[i], lineTotal: e.target.value === '' ? undefined : parseFloat(e.target.value) }; return next; })} />
            ) : (r.lineTotal) },
            { key: 'actions', label: 'Actions', render: (_: any, i: number) => edit ? (
              <Button size="small" color="error" onClick={() => setDraftLines((arr) => arr.filter((_, idx) => idx !== i))}>Delete</Button>
            ) : null },
          ] as any}
          rows={edit ? draftLines : lines}
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

      <ApproveDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const input: any = { id, supplierName: supplierName || null, storeId: storeId || null, createPurchaseOrder: createPO, createSupplierPayment: createPayment, receiveStock, receivedById: receivedById || null, confirmedById: confirmedById || null, useParsedTotal };
          if (edit && draftLines?.length) input.overrideLines = draftLines.map((l: any) => ({ description: l.description, qty: Number(l.qty) || 1, unitPrice: l.unitPrice ?? undefined, lineTotal: l.lineTotal ?? undefined, barcode: l.barcode || undefined }));
          const res = await approve({ variables: { input } });
          notify('Invoice import approved', 'success');
          const poId = res?.data?.adminApproveInvoiceImport?.purchaseOrderId;
          if (poId) {
            notify(`PO ready: ${poId}`, 'info');
            setTimeout(() => navigate(`/purchase-orders/${poId}`), 300);
          } else {
            // Fallback: search by invoice number or supplier
            const q = String((item?.parsed as any)?.invoiceNumber || supplierName || '').trim();
            if (q) {
              try {
                const { data: s } = await searchPOs({ variables: { q } });
                const found = s?.purchaseOrdersSearch?.[0]?.id;
                if (found) setTimeout(() => navigate(`/purchase-orders/${found}`), 300);
              } catch {}
            }
          }
          setOpen(false);
          await refetch();
        }}
        summary={{
          parsedTotal,
          computedTotal,
          diff,
          lineCount: (edit ? draftLines : lines).length,
          useParsedTotal,
          changedCount: (edit ? draftLines : []).filter((l: any, i: number) => edit && JSON.stringify(l) !== JSON.stringify(lines[i] || {})).length,
          changedDiffs: (edit ? draftLines : []).map((l: any, i: number) => (edit && JSON.stringify(l) !== JSON.stringify(lines[i] || {})) ? { index: i, before: lines[i] || {}, after: l } : null).filter(Boolean).slice(0, 5) as any,
        }}
      />

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

function ApproveDialog({ open, onClose, onConfirm, summary }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void>; summary: { parsedTotal: number; computedTotal: number; diff: number; lineCount: number; useParsedTotal: boolean; changedCount?: number; changedDiffs?: Array<{ index: number; before: any; after: any }> } }) {
  const { parsedTotal, computedTotal, diff, lineCount, useParsedTotal, changedCount, changedDiffs = [] } = summary;
  const fmt = (n: number) => isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Confirm Approval</DialogTitle>
      <DialogContent>
        <Typography>Lines: {lineCount}</Typography>
        {typeof changedCount === 'number' && changedCount > 0 && (
          <Typography color="warning.main">Edited lines: {changedCount}</Typography>
        )}
        {!!changedDiffs.length && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Sample edits</Typography>
            {changedDiffs.map(({ index, before, after }, i) => {
              const parts: string[] = [];
              const fields: Array<keyof any> = ['description','qty','unitPrice','lineTotal','barcode'];
              fields.forEach((f: any) => {
                const b = (before as any)?.[f];
                const a = (after as any)?.[f];
                if (JSON.stringify(b) !== JSON.stringify(a)) parts.push(`${f}: ${b ?? '—'} → ${a ?? '—'}`);
              });
              return (
                <Typography key={i} sx={{ fontSize: 12, color: 'text.secondary' }}>Row {index + 1}: {parts.join('; ')}</Typography>
              );
            })}
          </Box>
        )}
        <Typography>Parsed Total: ₦{fmt(parsedTotal)}</Typography>
        <Typography>Lines Total: ₦{fmt(computedTotal)}</Typography>
        <Typography>Using: {useParsedTotal ? 'Parsed Total' : 'Lines Total'}</Typography>
        {Math.abs(diff) > 0.5 && (
          <Alert severity="warning" sx={{ mt: 1 }}>Totals differ by ₦{fmt(diff)}.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>Approve</Button>
      </DialogActions>
    </Dialog>
  );
}
