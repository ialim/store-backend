import React from 'react';
import {
  useFulfillPurchaseReturnMutation,
  usePurchaseReturnsBySupplierLazyQuery,
} from '../generated/graphql';
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TableList from '../shared/TableList';
import { ConfirmButton } from '../shared/Confirm';
import { notify } from '../shared/notify';
import { ListingHero } from '../shared/ListingLayout';

export default function PurchaseReturns() {
  const [supplierId, setSupplierId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [loadReturns, { data, loading, error }] =
    usePurchaseReturnsBySupplierLazyQuery();
  const [fulfillReturn, { loading: fulfilling }] =
    useFulfillPurchaseReturnMutation();

  const returns = data?.purchaseReturnsBySupplier ?? [];

  const filteredReturns = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return returns;
    return returns.filter((row: any) => {
      const values = [row.id, row.status, row.purchaseOrderId]
        .filter(Boolean)
        .map((value: string) => value.toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [returns, search]);

  const handleFetch = React.useCallback(() => {
    if (!supplierId) return;
    loadReturns({ variables: { supplierId } });
  }, [supplierId, loadReturns]);

  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : filteredReturns;
    if (!rowsToUse?.length) return;
    const header = ['id', 'status', 'createdAt', 'purchaseOrderId'];
    const rows = rowsToUse.map((row: any) => [
      row.id,
      row.status,
      row.createdAt,
      row.purchaseOrderId || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `purchase-returns-${supplierId || 'supplier'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Purchase Returns
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inspect purchase return requests submitted for a supplier and complete them when stock is received.
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by return ID, status, or PO ID',
        }}
        trailing={
          <TextField
            label="Supplier ID"
            size="small"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 220 } }}
          />
        }
        action={
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={!supplierId}
            sx={{ minWidth: { xs: '100%', md: 160 } }}
          >
            Load purchase returns
          </Button>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {supplierId
            ? `${filteredReturns.length} return${filteredReturns.length === 1 ? '' : 's'} loaded.`
            : 'Enter a supplier ID to load purchase returns.'}
        </Typography>
      </ListingHero>

      {error && (
        <Alert
          severity="error"
          onClick={() => handleFetch()}
          sx={{ cursor: supplierId ? 'pointer' : 'default' }}
        >
          {error.message} {supplierId ? '(tap to retry)' : ''}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid rgba(16,94,62,0.12)',
        }}
      >
        <TableList
          columns={[
            { key: 'id', label: 'ID', sort: true },
            { key: 'status', label: 'Status', sort: true },
            {
              key: 'purchaseOrder',
              label: 'Purchase Order',
              render: (row: any) => row.purchaseOrderId || '—',
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row: any) => (
                <ConfirmButton
                  variant="outlined"
                  disabled={fulfilling}
                  onConfirm={async () => {
                    await fulfillReturn({ variables: { input: { id: row.id } } });
                    handleFetch();
                    notify('Purchase return fulfilled', 'success');
                  }}
                >
                  Fulfill
                </ConfirmButton>
              ),
            },
          ] as any}
          rows={filteredReturns}
          loading={loading && !returns.length}
          emptyMessage={
            supplierId ? 'No purchase returns for this supplier.' : 'Enter a supplier ID to load purchase returns.'
          }
          getRowKey={(row: any) => row.id}
          showFilters
          globalSearch
          globalSearchPlaceholder="Search purchase returns"
          enableUrlState
          urlKey="purchase_returns"
          onExport={exportCsv}
          exportScopeControl
        />
      </Paper>
    </Stack>
  );
}
