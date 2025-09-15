import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { notify } from '../shared/notify';
import React from 'react';
import { useParams } from 'react-router-dom';
import TableList from '../shared/TableList';

const RFQ_DASH = gql`
  query RfqDashboard($id: String!) {
    rfqDashboard(requisitionId: $id) {
      draft
      submitted
      selected
      rejected
      total
      pendingQuotes { id requisitionId supplierId status validUntil createdAt }
    }
  }
`;

const QUOTES = gql`
  query QuotesByReq($id: String!) {
    supplierQuotesByRequisition(requisitionId: $id) {
      id
      requisitionId
      supplierId
      status
      validUntil
      createdAt
    }
  }
`;

const ISSUE_PREF = gql`mutation($id: String!) { issueRFQPreferred(requisitionId: $id) }`;
const SELECT_QUOTE = gql`mutation($quoteId: String!, $exclusive: Boolean) { selectSupplierQuote(input: { quoteId: $quoteId, exclusive: $exclusive }) }`;

export default function RequisitionDetail() {
  const { id } = useParams();
  const { data: dashData, loading: dashLoading, error: dashError, refetch: refetchDash } = useQuery(RFQ_DASH, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const { data: qData, loading: qLoading, error: qError, refetch: refetchQuotes } = useQuery(QUOTES, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const dash = dashData?.rfqDashboard;
  const quotes = qData?.supplierQuotesByRequisition ?? [];
  const [issuePref, { loading: issuing }] = useMutation(ISSUE_PREF);
  const [selectQuote] = useMutation(SELECT_QUOTE);
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : quotes).map((q: any) => [q.id, q.supplierId, q.status, q.validUntil || '', q.createdAt || '']);
    if (!rows.length) return;
    const header = ['id','supplierId','status','validUntil','createdAt'];
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `requisition-${id}-quotes.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Requisition {id}</Typography>
      {(dashError || qError) && <Alert severity="error">{dashError?.message || qError?.message}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="subtitle1">RFQ Status</Typography>
          {dashLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : dash ? (
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography color="text.secondary">Draft: <b>{dash.draft}</b></Typography>
              <Typography color="text.secondary">Submitted: <b>{dash.submitted}</b></Typography>
              <Typography color="text.secondary">Selected: <b>{dash.selected}</b></Typography>
              <Typography color="text.secondary">Rejected: <b>{dash.rejected}</b></Typography>
              <Typography color="text.secondary">Total: <b>{dash.total}</b></Typography>
              <Button size="small" onClick={() => { refetchDash(); refetchQuotes(); }}>Refresh</Button>
              {(dash.total ?? 0) === 0 && (
                <Button size="small" variant="contained" disabled={issuing} onClick={async () => {
                  try { await issuePref({ variables: { id } }); notify('Issued RFQ to preferred suppliers','success'); refetchDash(); refetchQuotes(); } catch (e: any) { notify(e?.message || 'Failed to issue RFQ','error'); }
                }}>{issuing ? 'Issuing…' : 'Issue RFQ (Preferred)'}</Button>
              )}
            </Stack>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle1">Supplier Quotes</Typography>
          <TableList
            columns={[
              { key: 'supplierId', label: 'Supplier', render: (r: any) => r.supplierId, sort: true, filter: true },
              { key: 'status', label: 'Status', render: (r: any) => r.status, sort: true, filter: true },
              { key: 'validUntil', label: 'Valid Until', render: (r: any) => r.validUntil ? new Date(r.validUntil).toLocaleDateString() : '—', sort: true, accessor: (r: any) => new Date(r.validUntil || 0) },
              { key: 'createdAt', label: 'Created', render: (r: any) => new Date(r.createdAt).toLocaleString(), sort: true, accessor: (r: any) => new Date(r.createdAt || 0) },
              { key: 'actions', label: 'Actions', render: (r: any) => (
                <Button size="small" disabled={r.status === 'SELECTED'} onClick={async () => { try { await selectQuote({ variables: { quoteId: r.id, exclusive: true } }); notify('Quote selected','success'); refetchDash(); refetchQuotes(); } catch (e: any) { notify(e?.message || 'Failed to select quote','error'); } }}>Select</Button>
              ) },
            ] as any}
            rows={quotes}
            loading={qLoading}
            emptyMessage="No quotes"
            getRowKey={(r: any) => r.id}
            defaultSortKey="createdAt"
            showFilters
            enableUrlState
            urlKey="req_quotes"
            onExport={exportCsv}
            exportScopeControl
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
