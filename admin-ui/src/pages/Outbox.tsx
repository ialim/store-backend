import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Skeleton,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';

const STATUS = gql`
  query OutboxStatus {
    outboxStatus {
      pending
      failed
      published
    }
  }
`;

const LAST_FAILED = gql`
  query LastFailed($limit: Int) {
    lastFailedOutboxEvents(limit: $limit) {
      id
      type
      lastError
      createdAt
    }
  }
`;

const PROCESS = gql`
  mutation ProcessOutbox($limit: Int, $type: String, $status: String) {
    processOutbox(limit: $limit, type: $type, status: $status)
  }
`;

const RETRY = gql`
  mutation RetryFailed($limit: Int, $type: String) {
    retryOutboxFailed(limit: $limit, type: $type)
  }
`;

const BY_TYPE = gql`
  query StatusByType($types: [String!]) {
    outboxStatusByType(types: $types) { type pending failed published }
  }
`;

export default function Outbox() {
  const { data, loading, error, refetch } = useQuery(STATUS, { fetchPolicy: 'network-only' });
  const { data: failed, loading: loadingFailed, error: errorFailed, refetch: refetchFailed } = useQuery(LAST_FAILED, {
    variables: { limit: 10 },
  });
  const { data: byType, loading: loadingByType, error: errorByType, refetch: refetchByType } = useQuery(BY_TYPE, { fetchPolicy: 'network-only' });
  const [process, { loading: processing }] = useMutation(PROCESS);
  const [retry, { loading: retrying }] = useMutation(RETRY);
  const [msg, setMsg] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalSec, setIntervalSec] = useState(10);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(async () => {
      await refetch();
      await refetchFailed();
    }, Math.max(3, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec, refetch, refetchFailed]);

  const run = async () => {
    setMsg(null);
    const res = await process({ variables: { limit: 50 } });
    setMsg(`Processed ${res.data?.processOutbox ?? 0} events`);
    await refetch();
    await Promise.all([refetch(), refetchFailed(), refetchByType()]);
  };
  const runRetry = async () => {
    setMsg(null);
    const res = await retry({ variables: { limit: 100 } });
    setMsg(`Requeued ${res.data?.retryOutboxFailed ?? 0} failed events`);
    await Promise.all([refetch(), refetchFailed(), refetchByType()]);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Outbox</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {(error || errorFailed) && (
        <Alert severity="error">{error?.message || errorFailed?.message}</Alert>
      )}
      <Grid container spacing={2}>
        {[{ label: 'Pending', key: 'pending' }, { label: 'Failed', key: 'failed' }, { label: 'Published', key: 'published' }].map((c) => (
          <Grid item xs={12} sm={4} key={c.key}>
            <Card>
              <CardContent>
                <Typography>{c.label}</Typography>
                {loading ? (
                  <Skeleton variant="text" width={80} height={48} />
                ) : (
                  <Typography variant="h4">{(data?.outboxStatus as any)?.[c.key] ?? 0}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="contained" onClick={run} disabled={processing} startIcon={processing ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {processing ? 'Processing…' : 'Process'}
        </Button>
        <Button variant="outlined" onClick={runRetry} disabled={retrying} startIcon={retrying ? <CircularProgress size={16} /> : undefined}>
          {retrying ? 'Retrying…' : 'Retry Failed'}
        </Button>
        <FormControlLabel
          control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
          label={`Auto Refresh (${intervalSec}s)`}
        />
        <TextField
          label="Interval"
          type="number"
          size="small"
          value={intervalSec}
          onChange={(e) => setIntervalSec(Number(e.target.value) || 10)}
          inputProps={{ min: 3, style: { width: 80 } }}
        />
        {(error || errorFailed) && (
          <Button variant="text" onClick={async () => { await refetch(); await refetchFailed(); }}>Retry</Button>
        )}
      </Stack>
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Last Failed
        </Typography>
        <Stack spacing={1}>
          {loadingFailed && !(failed?.lastFailedOutboxEvents?.length) && (
            <>
              {[...Array(3)].map((_, i) => (
                <Card key={i}><CardContent>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" />
                </CardContent></Card>
              ))}
            </>
          )}
          {(failed?.lastFailedOutboxEvents ?? []).map((e: any) => (
            <Card key={e.id}>
              <CardContent>
                <Typography variant="subtitle2">{e.type}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {e.lastError}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>Status by Type</Typography>
        {errorByType && (
          <Alert severity="error">{errorByType.message}</Alert>
        )}
        <Grid container spacing={2}>
          {(loadingByType && !(byType?.outboxStatusByType?.length)) ? (
            [...Array(3)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card><CardContent>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent></Card>
              </Grid>
            ))
          ) : (
            (byType?.outboxStatusByType ?? []).map((row: any) => (
              <Grid item xs={12} sm={6} md={4} key={row.type}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">{row.type || '—'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending: {row.pending} • Failed: {row.failed} • Published: {row.published}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>
    </Stack>
  );
}
