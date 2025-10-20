import React from 'react';
import {
  useSalesReturnsByStoreLazyQuery,
  useUpdateSalesReturnStatusMutation,
  ReturnStatus,
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

export default function Returns() {
  const [storeId, setStoreId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [loadSales, { data, loading, error }] =
    useSalesReturnsByStoreLazyQuery();
  const [updateReturn, { loading: updating }] =
    useUpdateSalesReturnStatusMutation();

  const returns = data?.salesReturnsByStore ?? [];

  const filteredReturns = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return returns;
    return returns.filter((row: any) => {
      const values = [
        row.id,
        row.status,
        row.consumerSaleId,
        row.resellerSaleId,
      ]
        .filter(Boolean)
        .map((value: string) => value.toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [returns, search]);

  const handleFetch = React.useCallback(() => {
    if (!storeId) return;
    loadSales({ variables: { storeId } });
  }, [storeId, loadSales]);

  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : filteredReturns;
    if (!rowsToUse?.length) return;
    const header = ['id', 'status', 'createdAt', 'saleId'];
    const rows = rowsToUse.map((row: any) => [
      row.id,
      row.status,
      row.createdAt,
      row.consumerSaleId || row.resellerSaleId || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sales-returns-${storeId || 'store'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Sales Returns
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review return requests for a store and decide whether to accept or reject them.
        </Typography>
      </Stack>

      <ListingHero
        density="compact"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by return ID, status, or sale ID',
        }}
        trailing={
          <TextField
            label="Store ID"
            size="small"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 220 } }}
          />
        }
        action={
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={!storeId}
            sx={{ minWidth: { xs: '100%', md: 140 } }}
          >
            Load returns
          </Button>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {storeId
            ? `${filteredReturns.length} return${filteredReturns.length === 1 ? '' : 's'} loaded.`
            : 'Enter a store ID to load returns.'}
        </Typography>
      </ListingHero>

      {error && (
        <Alert
          severity="error"
          onClick={() => handleFetch()}
          sx={{ cursor: storeId ? 'pointer' : 'default' }}
        >
          {error.message} {storeId ? '(tap to retry)' : ''}
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
              key: 'sale',
              label: 'Sale',
              render: (row: any) => row.consumerSaleId || row.resellerSaleId || '—',
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row: any) => (
                <Stack direction="row" spacing={1}>
                  <ConfirmButton
                    variant="outlined"
                    disabled={updating}
                    onConfirm={async () => {
                      await updateReturn({
                        variables: {
                          input: { id: row.id, status: ReturnStatus.Accepted },
                        },
                      });
                      handleFetch();
                      notify('Sales return accepted', 'success');
                    }}
                  >
                    Accept
                  </ConfirmButton>
                  <ConfirmButton
                    color="error"
                    variant="outlined"
                    disabled={updating}
                    onConfirm={async () => {
                      await updateReturn({
                        variables: {
                          input: { id: row.id, status: ReturnStatus.Rejected },
                        },
                      });
                      handleFetch();
                      notify('Sales return rejected', 'info');
                    }}
                  >
                    Reject
                  </ConfirmButton>
                </Stack>
              ),
            },
          ] as any}
          rows={filteredReturns}
          loading={loading && !returns.length}
          emptyMessage={storeId ? 'No returns found for this store.' : 'Enter a store ID to load returns.'}
          getRowKey={(row: any) => row.id}
          showFilters
          globalSearch
          globalSearchPlaceholder="Search returns"
          enableUrlState
          urlKey="returns_sales"
          onExport={exportCsv}
          exportScopeControl
        />
      </Paper>
    </Stack>
  );
}
