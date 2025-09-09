import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export function ConfirmButton({
  children,
  title = 'Are you sure?',
  message,
  onConfirm,
  disabled,
  color,
  variant,
}: {
  children: React.ReactNode;
  title?: string;
  message?: string;
  onConfirm: () => Promise<any> | any;
  disabled?: boolean;
  color?: any;
  variant?: any;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <Button color={color} variant={variant} disabled={disabled} onClick={() => setOpen(true)}>{children}</Button>
      <Dialog open={open} onClose={() => !busy && setOpen(false)}>
        <DialogTitle>{title}</DialogTitle>
        {message && <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>}
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setOpen(false); } }} autoFocus disabled={busy}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

