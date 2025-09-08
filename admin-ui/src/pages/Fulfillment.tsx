import { gql, useMutation } from '@apollo/client';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const ASSIGN = gql`
  mutation Assign($input: AssignFulfillmentPersonnelInput!) {
    assignFulfillmentPersonnel(input: $input) { saleOrderId status deliveryPersonnelId }
  }
`;

const UPDATE = gql`
  mutation UpdateF($input: UpdateFulfillmentStatusInput!) {
    updateFulfillmentStatus(input: $input) { saleOrderId status }
  }
`;

export default function Fulfillment() {
  const [orderId, setOrderId] = useState('');
  const [personId, setPersonId] = useState('');
  const [status, setStatus] = useState('ASSIGNED');
  const [pin, setPin] = useState('');
  const [assign, { loading: assigning }] = useMutation(ASSIGN);
  const [update, { loading: updating }] = useMutation(UPDATE);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const doAssign = async () => {
    setErr(null); setMsg(null);
    try {
      await assign({ variables: { input: { saleOrderId: orderId, deliveryPersonnelId: personId } } });
      setMsg('Assigned delivery personnel');
    } catch (e: any) { setErr(e?.message || 'Failed'); }
  };
  const doUpdate = async () => {
    setErr(null); setMsg(null);
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
        <TextField label="Status (ASSIGNED/IN_TRANSIT/DELIVERED/CANCELLED)" value={status} onChange={e => setStatus(e.target.value)} />
        <TextField label="Confirmation PIN (optional for DELIVERED)" value={pin} onChange={e => setPin(e.target.value)} />
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={doUpdate} disabled={updating || !orderId}>Update Status</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

