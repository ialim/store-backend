import { useSupplierAgingDataLazyQuery } from '../generated/graphql';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { SupplierSelect } from '../shared/IdSelects';
import React from 'react';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';


type AgingRow = { bucket: string; amount: number };

export default function SupplierAging() {
  const [supplierId, setSupplierId] = React.useState('');
  const [load, { data, loading, error }] = useSupplierAgingDataLazyQuery();
  const pos = data?.purchaseOrdersBySupplier ?? [];
  const today = new Date();
  const buckets = React.useMemo(() => {
    const sums: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const po of pos) {
      const total = Number(po.totalAmount || 0);
      const paid = (po.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const outstanding = Math.max(0, total - paid);
      if (outstanding <= 0) continue;
      const baseDate = po.dueDate ? new Date(po.dueDate) : new Date(po.createdAt);
      const ageDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays <= 30) sums['0-30'] += outstanding;
      else if (ageDays <= 60) sums['31-60'] += outstanding;
      else if (ageDays <= 90) sums['61-90'] += outstanding;
      else sums['90+'] += outstanding;
    }
    return [
      { bucket: '0-30', amount: sums['0-30'] },
      { bucket: '31-60', amount: sums['31-60'] },
      { bucket: '61-90', amount: sums['61-90'] },
      { bucket: '90+', amount: sums['90+'] },
    ] as AgingRow[];
  }, [pos]);

  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : buckets).map((r: any) => [r.bucket, r.amount]);
    const header = ['bucket','amount'];
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `supplier-aging-${(supplierId||'supplier')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Supplier Aging</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <SupplierSelect value={supplierId} onChange={setSupplierId} label="Supplier" placeholder="Search supplier name" />
        <Button variant="contained" onClick={async () => supplierId && load({ variables: { supplierId }, fetchPolicy: 'network-only' as any })} disabled={!supplierId || loading}>Load</Button>
      </Stack>
      {error && <Alert severity="error">{String(error.message)}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="subtitle1">Aging Buckets</Typography>
          <TableList
            columns={[
              { key: 'bucket', label: 'Bucket' },
              { key: 'amount', label: 'Outstanding', render: (r: any) => formatMoney(r.amount), sort: true, accessor: (r: any) => r.amount || 0 },
            ] as any}
            rows={buckets}
            loading={loading}
            emptyMessage={supplierId ? 'No outstanding' : 'Select supplier'}
            getRowKey={(r: any) => r.bucket}
            defaultSortKey="bucket"
            onExport={exportCsv}
            exportScopeControl
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
