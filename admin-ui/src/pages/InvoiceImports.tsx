import { useCreateInvoiceImportMutation, useInvoiceImportsQuery } from '../generated/graphql';
import { Button, Card, CardContent, Chip, Stack, Typography, Box } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';
import { ListingHero } from '../shared/ListingLayout';

export default function InvoiceImports() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useInvoiceImportsQuery({ fetchPolicy: 'cache-and-network' });
  const [createImport, { loading: creating }] = useCreateInvoiceImportMutation();
  const items = data?.invoiceImports ?? [];
  const [search, setSearch] = React.useState('');
  const hasProcessing = items.some((x: any) => x.status === 'PROCESSING' || x.status === 'PENDING');
  React.useEffect(() => {
    if (!hasProcessing) return;
    const t = window.setInterval(() => { void refetch(); }, 3000);
    return () => window.clearInterval(t);
  }, [hasProcessing, refetch]);
  const createNew = async () => {
    const url = window.prompt('Invoice URL (text/PDF with text):');
    if (!url) return;
    const supplierName = window.prompt('Supplier Name (optional):') || undefined;
    const res = await createImport({ variables: { input: { url, supplierName } } });
    await refetch();
    const id = res.data?.adminCreateInvoiceImport?.id;
    if (id) navigate(`/invoice-imports/${id}`);
  };
  const filteredItems = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item: any) => {
      const supplier = (item.supplierName || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      return supplier.includes(term) || status.includes(term) || id.includes(term);
    });
  }, [items, search]);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Invoice Imports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review uploaded invoices and monitor processing status.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search supplier, status, or import ID',
        }}
        trailing={(<Button size="small" variant="outlined" onClick={() => navigate('/invoice-ingest')} sx={{ borderRadius: 999 }}>Process by URL</Button>)}
        action={(
          <Button size="small" onClick={createNew} disabled={creating} sx={{ borderRadius: 999 }}>
            New Import
          </Button>
        )}
        density="compact"
      />
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
          ] as any}
          rows={filteredItems}
          loading={loading}
          emptyMessage="No imports yet"
          getRowKey={(r: any) => r.id}
          defaultSortKey="createdAt"
          showFilters
          globalSearch={false}
          enableUrlState
          urlKey="invoice_imports"
          actions={{
            label: 'Actions',
            view: {
              onClick: (row: any) => navigate(`/invoice-imports/${row.id}`),
              label: 'Review import',
            },
          }}
        />
      </CardContent></Card>
    </Stack>
  );
}
