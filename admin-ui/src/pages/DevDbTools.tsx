import React from 'react';
import { useDevCountsQuery, useDevPurgeInvoiceImportsMutation, useDevPurgeOrphanVariantsMutation, useDevPurgeProductsMutation, useDevPurgePurchaseOrdersMutation } from '../generated/graphql';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography, FormControlLabel, Switch } from '@mui/material';
import { notify } from '../shared/notify';
import { useAuth } from '../shared/AuthProvider';


export default function DevDbTools() {
  const auth = useAuth();
  const { data, loading, error, refetch } = useDevCountsQuery({ fetchPolicy: 'network-only' as any });
  const [purgeImports] = useDevPurgeInvoiceImportsMutation();
  const [purgePos] = useDevPurgePurchaseOrdersMutation();
  const [purgeOrphans] = useDevPurgeOrphanVariantsMutation();
  const [beforeDate, setBeforeDate] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [beforeProducts, setBeforeProducts] = React.useState('');
  const [purgeProducts] = useDevPurgeProductsMutation();
  const [dryRunImports, setDryRunImports] = React.useState(false);
  const [dryRunPOs, setDryRunPOs] = React.useState(false);
  const [dryRunProducts, setDryRunProducts] = React.useState(false);
  const [dryRunOrphans, setDryRunOrphans] = React.useState(false);

  if (!auth.hasRole('SUPERADMIN')) return <Alert severity="error">Restricted to SUPERADMIN</Alert>;
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Dev DB Tools</Typography>
      {error && <Alert severity="error">{String(error.message)}</Alert>}
      <Card><CardContent>
        <Typography variant="subtitle1">Summary</Typography>
        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Box>Invoice Imports: <b>{data?.devCounts?.invoiceImports ?? 0}</b></Box>
            <Box>Purchase Orders: <b>{data?.devCounts?.purchaseOrders ?? 0}</b></Box>
            <Box>Orphan Variants: <b>{data?.devCounts?.orphanVariants ?? 0}</b></Box>
          </Stack>
        )}
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Invoice Imports</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Before date (YYYY-MM-DD)" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} />
          <FormControlLabel control={<Switch checked={dryRunImports} onChange={(e) => setDryRunImports(e.target.checked)} />} label="Dry Run" />
          <Button variant="contained" color="error" onClick={async () => {
            try {
              const confirmMsg = dryRunImports ? 'Preview delete invoice imports?' : 'Delete invoice imports? This cannot be undone.';
              if (!window.confirm(confirmMsg)) return;
              const res = await purgeImports({
                variables: {
                  filter: {
                    beforeDate: beforeDate || undefined,
                    dryRun: dryRunImports || undefined,
                  },
                },
              });
              const n = res.data?.devPurgeInvoiceImports ?? 0;
              notify(dryRunImports ? `Would delete ${n} invoice import(s).` : `Deleted ${n} invoice import(s).`, dryRunImports ? 'info' : 'success');
              await refetch();
            } catch (e: any) {
              notify(e?.message || 'Failed to purge invoice imports', 'error');
            }
          }}>Purge</Button>
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Purchase Orders</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Before date (YYYY-MM-DD)" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} />
          <TextField size="small" label="Status (optional)" value={status} onChange={(e) => setStatus(e.target.value)} />
          <FormControlLabel control={<Switch checked={dryRunPOs} onChange={(e) => setDryRunPOs(e.target.checked)} />} label="Dry Run" />
          <Button variant="contained" color="error" onClick={async () => {
            try {
              const confirmMsg = dryRunPOs ? 'Preview delete purchase orders?' : 'Delete purchase orders (and items)? This cannot be undone.';
              if (!window.confirm(confirmMsg)) return;
              const res = await purgePos({
                variables: {
                  filter: {
                    beforeDate: beforeDate || undefined,
                    status: status || undefined,
                    dryRun: dryRunPOs || undefined,
                  },
                },
              });
              const n = res.data?.devPurgePurchaseOrders ?? 0;
              notify(dryRunPOs ? `Would delete ${n} purchase order(s).` : `Deleted ${n} purchase order(s).`, dryRunPOs ? 'info' : 'success');
              await refetch();
            } catch (e: any) {
              notify(e?.message || 'Failed to purge purchase orders', 'error');
            }
          }}>Purge</Button>
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Products</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Before date (YYYY-MM-DD)" value={beforeProducts} onChange={(e) => setBeforeProducts(e.target.value)} />
          <FormControlLabel control={<Switch checked={dryRunProducts} onChange={(e) => setDryRunProducts(e.target.checked)} />} label="Dry Run" />
          <Button variant="contained" color="error" onClick={async () => {
            try {
              const confirmMsg = dryRunProducts ? 'Preview delete products?' : 'Delete products? Variants will be left orphaned; purge them separately.';
              if (!window.confirm(confirmMsg)) return;
              const res = await purgeProducts({
                variables: {
                  filter: {
                    beforeDate: beforeProducts || undefined,
                    dryRun: dryRunProducts || undefined,
                  },
                },
              });
              const n = res.data?.devPurgeProducts ?? 0;
              notify(dryRunProducts ? `Would delete ${n} product(s).` : `Deleted ${n} product(s).`, dryRunProducts ? 'info' : 'success');
              await refetch();
            } catch (e: any) {
              notify(e?.message || 'Failed to purge products', 'error');
            }
          }}>Purge</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">Note: This removes Products and their facet assignments. Variants remain orphaned and can be purged using the action below.</Typography>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Orphan Variants</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <FormControlLabel control={<Switch checked={dryRunOrphans} onChange={(e) => setDryRunOrphans(e.target.checked)} />} label="Dry Run" />
          <Button variant="contained" color="error" onClick={async () => {
            try {
              const confirmMsg = dryRunOrphans ? 'Preview delete orphan variants?' : 'Delete orphan variants (productId = null)?';
              if (!window.confirm(confirmMsg)) return;
              const res = await purgeOrphans({
                variables: {
                  filter: {
                    dryRun: dryRunOrphans || undefined,
                  },
                },
              });
              const n = res.data?.devPurgeOrphanVariants ?? 0;
              notify(dryRunOrphans ? `Would delete ${n} orphan variant(s).` : `Deleted ${n} orphan variant(s).`, dryRunOrphans ? 'info' : 'success');
              await refetch();
            } catch (e: any) {
              notify(e?.message || 'Failed to purge orphan variants', 'error');
            }
          }}>Purge Orphans</Button>
        </Stack>
      </CardContent></Card>
    </Stack>
  );
}
