import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { notify } from '../shared/notify';
import React from 'react';
import { useParams } from 'react-router-dom';
import TableList from '../shared/TableList';
import { Switch, FormControlLabel } from '@mui/material';

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
    purchaseRequisitionSummary(id: $id) { id status createdAt }
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
const REJECT_QUOTE = gql`mutation($quoteId: String!, $reason: String) { rejectSupplierQuote(input: { quoteId: $quoteId, reason: $reason }) }`;
const REJECT_REQ = gql`mutation($id: String!, $reason: String) { rejectPurchaseRequisition(input: { id: $id, reason: $reason }) }`;

export default function RequisitionDetail() {
  const { id } = useParams();
  const { data: dashData, loading: dashLoading, error: dashError, refetch: refetchDash } = useQuery(RFQ_DASH, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const { data: qData, loading: qLoading, error: qError, refetch: refetchQuotes } = useQuery(QUOTES, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const dash = dashData?.rfqDashboard;
  const reqSummary = dashData?.purchaseRequisitionSummary;
  const quotes = qData?.supplierQuotesByRequisition ?? [];
  const [issuePref, { loading: issuing }] = useMutation(ISSUE_PREF);
  const [selectQuote] = useMutation(SELECT_QUOTE);
  const [rejectQuote] = useMutation(REJECT_QUOTE);
  const [rejectReq, { loading: rejectingReq }] = useMutation(REJECT_REQ);
  const hasSelected = quotes.some((q: any) => q.status === 'SELECTED');
  const [nonExclusive, setNonExclusive] = React.useState(false);
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
          <Typography variant="subtitle1">RFQ Status {reqSummary?.status ? `• ${reqSummary.status}` : ''}</Typography>
          {dashLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : dash ? (
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography color="text.secondary">Draft: <b>{dash.draft}</b></Typography>
              <Typography color="text.secondary">Submitted: <b>{dash.submitted}</b></Typography>
              <Typography color="text.secondary">Selected: <b>{dash.selected}</b></Typography>
              <Typography color="text.secondary">Rejected: <b>{dash.rejected}</b></Typography>
              <Typography color="text.secondary">Total: <b>{dash.total}</b></Typography>
              <Chip size="small" label={(dash.total ?? 0) > 0 ? 'RFQ Issued' : 'Not Issued'} color={(dash.total ?? 0) > 0 ? 'success' as any : 'warning' as any} variant="outlined" />
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
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" disabled={reqSummary?.status !== 'DRAFT'} onClick={async () => {
              try { await (refetchDash as any).client.mutate({ mutation: gql`mutation($id: String!) { submitPurchaseRequisition(input: { id: $id }) }`, variables: { id } }); notify('Requisition submitted','success'); refetchDash(); } catch (e: any) { notify(e?.message || 'Failed to submit requisition','error'); }
            }}>Submit Requisition</Button>
            <Button size="small" variant="outlined" disabled={reqSummary?.status !== 'SUBMITTED'} onClick={async () => {
              try { await (refetchDash as any).client.mutate({ mutation: gql`mutation($id: String!) { approvePurchaseRequisition(input: { id: $id }) }`, variables: { id } }); notify('Requisition approved','success'); refetchDash(); } catch (e: any) { notify(e?.message || 'Failed to approve requisition','error'); }
            }}>Approve Requisition</Button>
            <Button size="small" color="error" variant="outlined" disabled={!(reqSummary?.status === 'DRAFT' || reqSummary?.status === 'SUBMITTED') || rejectingReq} onClick={async () => {
              const reason = window.prompt('Reason for rejection (optional):') || undefined;
              try { await rejectReq({ variables: { id, reason } }); notify('Requisition rejected','info'); refetchDash(); refetchQuotes(); } catch (e: any) { notify(e?.message || 'Failed to reject requisition','error'); }
            }}>{rejectingReq ? 'Rejecting…' : 'Reject Requisition'}</Button>
            <FormControlLabel control={<Switch checked={nonExclusive} onChange={(e) => setNonExclusive(e.target.checked)} />} label="Allow multiple (non-exclusive)" />
          </Stack>
          <TableList
            columns={[
              { key: 'supplierId', label: 'Supplier', render: (r: any) => r.supplierId, sort: true, filter: true },
              { key: 'status', label: 'Status', render: (r: any) => (r.status === 'SELECTED' ? <Chip size="small" color="success" label="SELECTED" /> : r.status), sort: true, filter: true },
              { key: 'validUntil', label: 'Valid Until', render: (r: any) => r.validUntil ? new Date(r.validUntil).toLocaleDateString() : '—', sort: true, accessor: (r: any) => new Date(r.validUntil || 0) },
              { key: 'createdAt', label: 'Created', render: (r: any) => new Date(r.createdAt).toLocaleString(), sort: true, accessor: (r: any) => new Date(r.createdAt || 0) },
              { key: 'actions', label: 'Actions', render: (r: any) => (
                <Stack direction="row" spacing={1}>
                  <Button size="small" disabled={r.status === 'SELECTED' || (hasSelected && !nonExclusive)} onClick={async () => { try { await selectQuote({ variables: { quoteId: r.id, exclusive: !nonExclusive } }); notify('Quote selected','success'); refetchDash(); refetchQuotes(); } catch (e: any) { notify(e?.message || 'Failed to select quote','error'); } }}>Select</Button>
                  <Button size="small" color="error" disabled={r.status === 'REJECTED'} onClick={async () => {
                    const reason = window.prompt('Reason for rejection (optional):') || undefined;
                    try { await rejectQuote({ variables: { quoteId: r.id, reason } }); notify('Quote rejected','info'); refetchDash(); refetchQuotes(); } catch (e: any) { notify(e?.message || 'Failed to reject quote','error'); }
                  }}>Reject</Button>
                </Stack>
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
