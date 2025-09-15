import { gql, useLazyQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';

const BY_SUPPLIER = gql`
  query SupplierStatementData($supplierId: String!) {
    purchaseOrdersBySupplier(supplierId: $supplierId) { id totalAmount createdAt }
    supplierPaymentsBySupplier(supplierId: $supplierId) { id amount paymentDate method }
  }
`;

export default function SupplierStatement() {
  const [supplierId, setSupplierId] = React.useState('');
  const [load, { data, loading, error }] = useLazyQuery(BY_SUPPLIER);
  const pos = data?.purchaseOrdersBySupplier ?? [];
  const pays = data?.supplierPaymentsBySupplier ?? [];
  const entries = React.useMemo(() => {
    type Entry = { date: string; type: 'PO'|'PAYMENT'; ref: string; charge: number; credit: number };
    const list: Entry[] = [];
    for (const p of pos) list.push({ date: p.createdAt, type: 'PO', ref: p.id, charge: p.totalAmount || 0, credit: 0 });
    for (const s of pays) list.push({ date: s.paymentDate, type: 'PAYMENT', ref: s.id, charge: 0, credit: s.amount || 0 });
    list.sort((a, b) => {
      const da = new Date(a.date).getTime(); const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return a.type === 'PO' ? -1 : 1; // PO first on same day
    });
    let running = 0;
    return list.map((e) => {
      running += e.charge - e.credit;
      return { ...e, running } as any;
    });
  }, [pos, pays]);
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : entries).map((e: any) => [e.date, e.type, e.ref, e.charge, e.credit, e.running]);
    if (!rows.length) return;
    const header = ['date','type','ref','charge','credit','running'];
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `supplier-statement-${supplierId}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Supplier Statement</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField label="Supplier ID" size="small" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <Button variant="contained" onClick={() => supplierId && load({ variables: { supplierId }, fetchPolicy: 'network-only' })} disabled={!supplierId || loading}>Load</Button>
      </Stack>
      {error && <Alert severity="error">{String(error.message)}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="subtitle1">Statement</Typography>
          <TableList
            columns={[
              { key: 'date', label: 'Date', render: (e: any) => new Date(e.date).toLocaleDateString(), sort: true, accessor: (e: any) => new Date(e.date) },
              { key: 'type', label: 'Type', render: (e: any) => e.type },
              { key: 'ref', label: 'Ref', render: (e: any) => e.ref, filter: true },
              { key: 'charge', label: 'Charge', render: (e: any) => e.charge ? formatMoney(e.charge) : '—', sort: true, accessor: (e: any) => e.charge || 0 },
              { key: 'credit', label: 'Credit', render: (e: any) => e.credit ? formatMoney(e.credit) : '—', sort: true, accessor: (e: any) => e.credit || 0 },
              { key: 'running', label: 'Running', render: (e: any) => formatMoney(e.running), sort: true, accessor: (e: any) => e.running || 0 },
            ] as any}
            rows={entries}
            loading={loading}
            emptyMessage={supplierId ? 'No entries' : 'Enter supplier ID'}
            getRowKey={(e: any, i: number) => `${e.type}:${e.ref}:${i}`}
            defaultSortKey="date"
            showFilters
            enableUrlState
            urlKey="supplier_statement"
            onExport={exportCsv}
            exportScopeControl
          />
        </CardContent>
      </Card>
    </Stack>
  );
}

