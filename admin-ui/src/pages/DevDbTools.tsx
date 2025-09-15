import React from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../shared/AuthProvider';

const COUNTS = gql`query { devCounts { invoiceImports purchaseOrders orphanVariants } }`;
const PURGE_IMPORTS = gql`mutation($beforeDate: String) { devPurgeInvoiceImports(filter: { beforeDate: $beforeDate }) }`;
const PURGE_POS = gql`mutation($beforeDate: String, $status: String) { devPurgePurchaseOrders(filter: { beforeDate: $beforeDate, status: $status }) }`;
const PURGE_ORPHANS = gql`mutation { devPurgeOrphanVariants }`;

export default function DevDbTools() {
  const auth = useAuth();
  const { data, loading, error, refetch } = useQuery(COUNTS, { fetchPolicy: 'network-only' });
  const [purgeImports] = useMutation(PURGE_IMPORTS);
  const [purgePos] = useMutation(PURGE_POS);
  const [purgeOrphans] = useMutation(PURGE_ORPHANS);
  const [beforeDate, setBeforeDate] = React.useState('');
  const [status, setStatus] = React.useState('');

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
          <Button variant="contained" color="error" onClick={async () => {
            if (!window.confirm('Delete invoice imports? This cannot be undone.')) return;
            await purgeImports({ variables: { beforeDate: beforeDate || null } });
            await refetch();
          }}>Purge</Button>
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Purchase Orders</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Before date (YYYY-MM-DD)" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} />
          <TextField size="small" label="Status (optional)" value={status} onChange={(e) => setStatus(e.target.value)} />
          <Button variant="contained" color="error" onClick={async () => {
            if (!window.confirm('Delete purchase orders (and items)? This cannot be undone.')) return;
            await purgePos({ variables: { beforeDate: beforeDate || null, status: status || null } });
            await refetch();
          }}>Purge</Button>
        </Stack>
      </CardContent></Card>

      <Card><CardContent>
        <Typography variant="subtitle1">Purge Orphan Variants</Typography>
        <Button variant="contained" color="error" onClick={async () => {
          if (!window.confirm('Delete orphan variants (productId = null)?')) return;
          await purgeOrphans();
          await refetch();
        }}>Purge Orphans</Button>
      </CardContent></Card>
    </Stack>
  );
}

