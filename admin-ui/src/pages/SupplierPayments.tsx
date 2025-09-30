import { useCreateSupplierPaymentMutation, useSupplierPaymentsByPoQuery } from '../generated/graphql';
import { Alert, Button, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import { notify } from '../shared/notify';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';

export default function SupplierPayments() {
  const [purchaseOrderId, setPurchaseOrderId] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [amount, setAmount] = React.useState<number>(0);
  const [paymentDate, setPaymentDate] = React.useState<string>('');
  const [method, setMethod] = React.useState('TRANSFER');
  const [notes, setNotes] = React.useState('');

  const { data, loading, error, refetch } = useSupplierPaymentsByPoQuery({ variables: { purchaseOrderId }, skip: !purchaseOrderId, fetchPolicy: 'cache-and-network' });
  const [create, { loading: creating, error: createErr }] = useCreateSupplierPaymentMutation();
  const list = data?.supplierPaymentsByPO ?? [];
  const poTotal = data?.purchaseOrder?.totalAmount ?? 0;
  const sortedAsc = React.useMemo(() => (list || []).slice().sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()), [list]);
  const runningMap = React.useMemo(() => {
    let sum = 0;
    const m = new Map<string, number>();
    for (const p of sortedAsc) { sum += p.amount || 0; m.set(p.id, sum); }
    return m;
  }, [sortedAsc]);
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : list;
    if (!rowsToUse?.length) return;
    const header = ['id','paymentDate','method','amount','runningPaid','remaining','notes'];
    const rmap = runningMap;
    const rows = rowsToUse.map((p: any) => {
      const running = rmap.get(p.id) ?? 0;
      const remaining = Math.max(0, (poTotal || 0) - running);
      return [p.id, new Date(p.paymentDate).toISOString(), p.method, p.amount, running, remaining, p.notes || ''];
    });
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-payments-${purchaseOrderId || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !amount || !paymentDate) return;
    const res = await create({ variables: { input: { supplierId, purchaseOrderId: purchaseOrderId || null, amount, paymentDate: new Date(paymentDate), method, notes: notes || null } } });
    if (res.data?.createSupplierPayment) notify('Supplier payment created','success');
    setAmount(0); setNotes('');
    if (purchaseOrderId) await refetch();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Supplier Payments</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">By Purchase Order</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField label="PO ID" size="small" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} />
                <Button variant="contained" onClick={() => purchaseOrderId && refetch()} disabled={!purchaseOrderId}>Load</Button>
              </Stack>
              {error && <Alert severity="error">{error.message}</Alert>}
              <TableList
                columns={[
                  { key: 'paymentDate', label: 'Date', render: (p: any) => new Date(p.paymentDate).toLocaleDateString(), sort: true, accessor: (p: any) => new Date(p.paymentDate) },
                  { key: 'method', label: 'Method', render: (p: any) => p.method, sort: true, filter: true },
                  { key: 'amount', label: 'Amount', render: (p: any) => formatMoney(p.amount), sort: true, accessor: (p: any) => p.amount },
                  { key: 'running', label: 'Running Paid', render: (p: any) => formatMoney(runningMap.get(p.id) ?? 0), sort: true, accessor: (p: any) => runningMap.get(p.id) ?? 0 },
                  { key: 'remaining', label: 'Remaining', render: (p: any) => formatMoney(Math.max(0, (poTotal || 0) - (runningMap.get(p.id) ?? 0))), sort: true, accessor: (p: any) => (poTotal || 0) - (runningMap.get(p.id) ?? 0) },
                  { key: 'notes', label: 'Notes', render: (p: any) => p.notes || '', filter: true },
                ] as any}
                rows={list}
                loading={loading}
                emptyMessage={purchaseOrderId ? 'No payments for this PO' : 'Enter a PO ID'}
                getRowKey={(p: any) => p.id}
                defaultSortKey="paymentDate"
                showFilters
                globalSearch
                globalSearchPlaceholder="Search payments"
                globalSearchKeys={['method','notes']}
                enableUrlState
                urlKey="supplier_po_payments"
                onExport={exportCsv}
                exportScopeControl
              />
              {purchaseOrderId && (
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Typography color="text.secondary">PO Total: {formatMoney(poTotal)}</Typography>
                  <Typography color="text.secondary">Paid So Far: {formatMoney(sortedAsc.reduce((s: number, p: any) => s + (p.amount || 0), 0))}</Typography>
                  <Typography color="text.secondary">Remaining: {formatMoney(Math.max(0, (poTotal || 0) - sortedAsc.reduce((s: number, p: any) => s + (p.amount || 0), 0)))}</Typography>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card component="form" onSubmit={submit}>
            <CardContent>
              <Typography variant="subtitle1">Create Payment</Typography>
              {createErr && <Alert severity="error">{createErr.message}</Alert>}
              <Stack spacing={1}>
                <TextField label="Supplier ID" size="small" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
                <TextField label="PO ID (optional)" size="small" value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} />
                <TextField label="Amount" type="number" size="small" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
                <TextField label="Payment Date" type="date" size="small" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="Method" size="small" value={method} onChange={(e) => setMethod(e.target.value)} />
                <TextField label="Notes" size="small" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button type="submit" variant="contained" disabled={creating || !supplierId || !amount || !paymentDate}>Create</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
