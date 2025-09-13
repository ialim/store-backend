import { gql, useMutation, useQuery } from '@apollo/client';
import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';

const LIST = gql`query InvoiceImports { invoiceImports { id url supplierName storeId status createdAt } }`;
const CREATE = gql`mutation CreateInvoiceImport($input: CreateInvoiceImportInput!) { adminCreateInvoiceImport(input: $input) { id } }`;

export default function InvoiceImports() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(LIST, { fetchPolicy: 'cache-and-network' });
  const [createImport, { loading: creating }] = useMutation(CREATE);
  const items = data?.invoiceImports ?? [];
  const hasProcessing = items.some((x: any) => x.status === 'PROCESSING' || x.status === 'PENDING');
  React.useEffect(() => {
    if (!hasProcessing) return;
    const t = setInterval(() => { refetch(); }, 3000);
    return () => clearInterval(t);
  }, [hasProcessing]);
  const createNew = async () => {
    const url = window.prompt('Invoice URL (text/PDF with text):');
    if (!url) return;
    const supplierName = window.prompt('Supplier Name (optional):') || undefined;
    const res = await createImport({ variables: { input: { url, supplierName } } });
    await refetch();
    const id = res.data?.adminCreateInvoiceImport?.id;
    if (id) navigate(`/invoice-imports/${id}`);
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5" sx={{ flex: 1 }}>Invoice Imports</Typography>
        <Button size="small" variant="outlined" onClick={() => navigate('/invoice-ingest')}>Process by URL</Button>
        <Button size="small" onClick={createNew} disabled={creating}>New Import</Button>
      </Stack>
      <Card><CardContent>
        {error && <Typography color="error">{error.message}</Typography>}
        {hasProcessing && <Typography color="text.secondary" sx={{ mb: 1 }}>Refreshing while imports are processing…</Typography>}
        <TableList
          columns={[
            { key: 'createdAt', label: 'Created', sort: true, accessor: (r: any) => new Date(r.createdAt) },
            { key: 'supplierName', label: 'Supplier', filter: true },
            { key: 'status', label: 'Status', sort: true, render: (r: any) => {
              const s = String(r.status || '').toUpperCase();
              const color = s === 'READY' || s === 'COMPLETED' ? 'success' : (s === 'FAILED' ? 'error' : (s === 'PROCESSING' || s === 'PENDING' ? 'info' : 'default'));
              return <Chip size="small" color={color as any} label={s} />;
            } },
            { key: 'actions', label: 'Actions', render: (r: any) => (
              <Button size="small" onClick={() => navigate(`/invoice-imports/${(r as any).id}`)}>Review</Button>
            ) },
          ] as any}
          rows={items}
          loading={loading}
          emptyMessage="No imports yet"
          getRowKey={(r: any) => r.id}
          defaultSortKey="createdAt"
          showFilters
          globalSearch
          globalSearchPlaceholder="Search supplier/invoice"
          globalSearchKeys={['supplierName']}
          enableUrlState
          urlKey="invoice_imports"
        />
      </CardContent></Card>
    </Stack>
  );
}
