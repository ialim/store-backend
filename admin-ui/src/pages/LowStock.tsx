import { useCreateLowStockRequisitionAndIssuePreferredMutation, useCreateRequisitionFromLowStockMutation, useLowStockCandidatesQuery, useRunLowStockScanNowMutation } from '../generated/graphql';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Stack, TextField, Typography, FormControlLabel, Switch } from '@mui/material';
import { useEffect, useState } from 'react';
import TableList from '../shared/TableList';
import { UserSelect } from '../shared/IdSelects';
import { notify } from '../shared/notify';

export default function LowStock() {
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const { data, loading, error, refetch } = useLowStockCandidatesQuery({ variables: { storeId, limit: 100 } });
  const [runScan, { loading: scanning }] = useRunLowStockScanNowMutation();
  const [createReq, { loading: creating }] = useCreateRequisitionFromLowStockMutation();
  const [createAndIssue, { loading: creatingIssuing }] = useCreateLowStockRequisitionAndIssuePreferredMutation();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalSec, setIntervalSec] = useState(15);
  const [requestedById, setRequestedById] = useState<string>('');
  const [lastReqId, setLastReqId] = useState<string>('');
  const navigate = useNavigate();

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
        <UserSelect value={requestedById} onChange={setRequestedById} label="Requested By" />
        <Button variant="contained" onClick={() => refetch()} disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button variant="outlined" onClick={doScan} disabled={scanning} startIcon={scanning ? <CircularProgress size={16} /> : undefined}>
          {scanning ? 'Scanning…' : 'Run Scan Now'}
        </Button>
        <Button variant="contained" disabled={!storeId || !requestedById || creating} onClick={async () => {
          try {
            const { data } = await createReq({ variables: { storeId, requestedById } });
            const reqId = data?.createRequisitionFromLowStock as string | null;
            if (reqId) { notify(`Requisition created: ${reqId}`, 'success'); setLastReqId(reqId); }
            else notify('No items qualified for requisition', 'info');
          } catch (e: any) {
            notify(e?.message || 'Failed to create requisition', 'error');
          }
        }}>{creating ? 'Creating…' : 'Create Requisition'}</Button>
        <Button variant="contained" color="secondary" disabled={!storeId || !requestedById || creatingIssuing} onClick={async () => {
          try {
            const { data } = await createAndIssue({ variables: { storeId, requestedById } });
            const reqId = data?.createLowStockRequisitionAndIssuePreferred as string | null;
            if (reqId) { notify(`Req created and RFQ issued: ${reqId}`, 'success'); setLastReqId(reqId); }
            else notify('No items qualified for requisition', 'info');
          } catch (e: any) {
            notify(e?.message || 'Failed to create and issue RFQ', 'error');
          }
        }}>{creatingIssuing ? 'Creating & Issuing…' : 'Create + Issue RFQ (Preferred)'}</Button>
        <FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />} label={`Auto Refresh (${intervalSec}s)`} />
        <TextField label="Interval" type="number" size="small" value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value) || 15)} inputProps={{ min: 5, style: { width: 80 } }} />
        {error && (
          <Button variant="text" onClick={() => refetch()}>Retry</Button>
        )}
      </Stack>
      <TableList
        columns={[
          { key: 'product', label: 'Product', render: (c: any) => c.productName || c.productVariantId },
          { key: 'store', label: 'Store', render: (c: any) => c.storeName || c.storeId },
          { key: 'qty', label: 'Qty', render: (c: any) => c.quantity },
          { key: 'reorderPoint', label: 'Reorder Point', render: (c: any) => c.reorderPoint },
          { key: 'reorderQty', label: 'Reorder Qty', render: (c: any) => c.reorderQty },
          { key: 'supplier', label: 'Supplier', render: (c: any) => c.supplierName || '—' },
          { key: 'cost', label: 'Cost', render: (c: any) => c.supplierDefaultCost ?? '—' },
          { key: 'lead', label: 'Lead (d)', render: (c: any) => c.supplierLeadTimeDays ?? '—' },
        ] as any}
        rows={list}
        loading={loading}
        emptyMessage="No low-stock candidates"
        getRowKey={(c: any) => `${c.storeId}:${c.productVariantId}`}
      />
      {lastReqId && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography color="text.secondary">Last requisition: {lastReqId}</Typography>
          <Button size="small" onClick={() => navigate(`/requisitions/${lastReqId}`)}>Open Requisition</Button>
        </Stack>
      )}
    </Stack>
  );
}
