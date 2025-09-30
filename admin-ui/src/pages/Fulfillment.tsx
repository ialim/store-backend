import {
  useAssignFulfillmentPersonnelMutation,
  useUpdateFulfillmentStatusMutation,
  FulfillmentStatus,
} from '../generated/graphql';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography, Select } from '@mui/material';
import { useState } from 'react';

export default function Fulfillment() {
  const [orderId, setOrderId] = useState('');
  const [personId, setPersonId] = useState('');
  const [status, setStatus] = useState<FulfillmentStatus>(FulfillmentStatus.Assigned);
  const [pin, setPin] = useState('');
  const [assign, { loading: assigning }] = useAssignFulfillmentPersonnelMutation();
  const [update, { loading: updating }] = useUpdateFulfillmentStatusMutation();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
        <Typography variant="h6">Fulfillment</Typography>
        {msg && <Alert severity="success">{msg}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Sale Order ID" value={orderId} onChange={e => setOrderId(e.target.value)} />
        <TextField label="Delivery Personnel ID" value={personId} onChange={e => setPersonId(e.target.value)} />
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={doAssign} disabled={assigning || !orderId || !personId}>Assign</Button>
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
            FulfillmentStatus.Pending,
          ].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
        <TextField label="Confirmation PIN (optional for DELIVERED)" value={pin} onChange={e => setPin(e.target.value)} />
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={doUpdate} disabled={updating || !orderId}>Update Status</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
