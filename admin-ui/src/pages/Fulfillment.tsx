type FulfilmentWorkflowResult = {
  fulfilmentWorkflow: {
    saleOrderId: string;
    state: string;
    context?: any;
    transitionLogs: Array<{
      id: string;
      fromState?: string | null;
      toState: string;
      event?: string | null;
      occurredAt: string;
    }>;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value ?? '—';
  }
}

import {
  useAssignFulfillmentPersonnelMutation,
  useUpdateFulfillmentStatusMutation,
  FulfillmentStatus,
} from '../generated/graphql';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { FulfilmentWorkflow } from '../operations/orders';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS } from '../shared/permissions';

export default function Fulfillment() {
  const { hasPermission } = useAuth();
  const canManageFulfilment = hasPermission(
    PERMISSIONS.sale.UPDATE ?? 'SALE_UPDATE',
  );
  const [orderId, setOrderId] = useState('');
  const [personId, setPersonId] = useState('');
  const [status, setStatus] = useState<FulfillmentStatus>(
    FulfillmentStatus.Assigned,
  );
  const [pin, setPin] = useState('');
  const [assign, { loading: assigning }] =
    useAssignFulfillmentPersonnelMutation();
  const [update, { loading: updating }] =
    useUpdateFulfillmentStatusMutation();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadWorkflow, { data: workflowData, loading: loadingWorkflow, error: workflowError }] =
    useLazyQuery<FulfilmentWorkflowResult>(FulfilmentWorkflow, {
      fetchPolicy: 'network-only',
    });
  const workflow = workflowData?.fulfilmentWorkflow ?? null;
  const disableActions = !canManageFulfilment;

  const doAssign = async () => {
    setErr(null); setMsg(null);
    if (!orderId || !personId) {
      setErr('Order ID and delivery personnel ID are required');
      return;
    }
    try {
      await assign({ variables: { input: { saleOrderId: orderId, deliveryPersonnelId: personId } } });
      setMsg('Assigned delivery personnel');
    } catch (e: any) { setErr(e?.message || 'Failed'); }
  };
  const doUpdate = async () => {
    setErr(null); setMsg(null);
    if (!orderId) {
      setErr('Order ID is required');
      return;
    }
    try {
      await update({ variables: { input: { saleOrderId: orderId, status, confirmationPin: pin || null } } });
      setMsg('Updated fulfillment status');
    } catch (e: any) { setErr(e?.message || 'Failed'); }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        {!canManageFulfilment && (
          <Alert severity="info">
            You only have read access to fulfilment actions. Update controls are
            disabled.
          </Alert>
        )}
        <Typography variant="h6">Fulfillment</Typography>
        {msg && <Alert severity="success">{msg}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Sale Order ID" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <TextField label="Delivery Personnel ID" value={personId} onChange={e => setPersonId(e.target.value)} />
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={doAssign}
            disabled={
              disableActions || assigning || !orderId || !personId
            }
          >
            Assign
          </Button>
        </Stack>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as FulfillmentStatus)}
          size="small"
          displayEmpty
        >
          {[
            FulfillmentStatus.Assigned,
            FulfillmentStatus.InTransit,
            FulfillmentStatus.Delivered,
            FulfillmentStatus.Cancelled,
          ].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
        <TextField label="Confirmation PIN (optional for DELIVERED)" value={pin} onChange={e => setPin(e.target.value)} />
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={doUpdate}
            disabled={disableActions || updating || !orderId}
          >
            Update Status
          </Button>
        </Stack>
        <Stack spacing={1} mt={2}>
          <Typography variant="subtitle1">Workflow Snapshot</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              onClick={() => {
                setErr(null);
                setMsg(null);
                if (orderId) {
                  loadWorkflow({ variables: { saleOrderId: orderId } });
                } else {
                  setErr('Enter a sale order ID to inspect the workflow.');
                }
              }}
              disabled={loadingWorkflow}
            >
              {loadingWorkflow ? 'Loading workflow...' : 'Load Workflow'}
            </Button>
          </Stack>
          {workflowError && (
            <Alert severity="error">{workflowError.message}</Alert>
          )}
          {workflow && (
            <Stack
              spacing={1}
              sx={{
                border: '1px solid rgba(16,94,62,0.12)',
                borderRadius: 1,
                p: 2,
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Current State
              </Typography>
              <Typography variant="subtitle2">{workflow.state}</Typography>
              {workflow.context && (
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{
                    m: 0,
                    p: 1,
                    bgcolor: 'common.white',
                    borderRadius: 1,
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(workflow.context, null, 2)}
                </Typography>
              )}
              {workflow.transitionLogs.length > 0 && (
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Recent Transitions
                  </Typography>
                  {workflow.transitionLogs.slice(0, 5).map((log) => (
                    <Typography
                      key={log.id}
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatDate(log.occurredAt)} · {log.fromState || '—'} →{' '}
                      {log.toState}
                      {log.event ? ` (${log.event})` : ''}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
