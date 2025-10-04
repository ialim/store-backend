import React from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notify } from '../shared/notify';
import { useVerifyEmailMutation } from '../generated/graphql';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [verifyEmail, { loading }] = useVerifyEmailMutation();
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!token) {
        setStatus('error');
        setErrorMsg('Missing verification token.');
        return;
      }
      try {
        await verifyEmail({ variables: { token } });
        if (!isMounted) return;
        setStatus('success');
        notify('Email verified successfully', 'success');
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMsg(err?.message || 'Verification failed.');
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  const heading =
    status === 'success'
      ? 'Email verified'
      : status === 'error'
      ? 'Verification failed'
      : 'Verifying email…';

  return (
    <Stack alignItems="center" justifyContent="center" sx={{ mt: 6 }}>
      <Card sx={{ maxWidth: 360, width: '100%' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h5">{heading}</Typography>
            {loading && <CircularProgress size={32} />}
            {status === 'success' && (
              <Typography variant="body2" color="text.secondary">
                Your email has been verified. You can now continue using the
                dashboard.
              </Typography>
            )}
            {status === 'error' && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {errorMsg}
              </Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => navigate('/')}
                disabled={loading}
              >
                Go to home
              </Button>
              {status === 'error' && token && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setStatus('idle');
                    setErrorMsg(null);
                    void verifyEmail({ variables: { token } })
                      .then(() => {
                        setStatus('success');
                        notify('Email verified successfully', 'success');
                      })
                      .catch((err: any) => {
                        setStatus('error');
                        setErrorMsg(err?.message || 'Verification failed.');
                      });
                  }}
                  disabled={loading}
                >
                  Try again
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
