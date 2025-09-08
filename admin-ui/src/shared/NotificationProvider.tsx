import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import type { NotifySeverity } from './notify';

type Notif = { message: string; severity: 'success' | 'info' | 'warning' | 'error' } | null;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notif, setNotif] = useState<Notif>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const anyEvt = e as CustomEvent;
      const detail = anyEvt.detail as { message: string; severity?: NotifySeverity };
      if (detail?.message) {
        setNotif({ message: detail.message, severity: detail.severity || 'info' });
        setOpen(true);
      }
    };
    window.addEventListener('app:notify', handler as EventListener);
    return () => window.removeEventListener('app:notify', handler as EventListener);
  }, []);

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Snackbar expects a ReactElement child; omit when none */}
        {notif ? (
          <Alert onClose={() => setOpen(false)} severity={notif.severity} variant="filled" sx={{ width: '100%' }}>
            {notif.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
