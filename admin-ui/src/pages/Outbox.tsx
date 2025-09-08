import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';

const STATUS = gql`
  query OutboxStatus {
    outboxStatus { pending failed published }
  }
`;

const LAST_FAILED = gql`
  query LastFailed($limit: Int) { lastFailedOutboxEvents(limit: $limit) { id type lastError createdAt } }
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

export default function Outbox() {
  const { data, refetch } = useQuery(STATUS, { fetchPolicy: 'network-only' });
  const { data: failed, refetch: refetchFailed } = useQuery(LAST_FAILED, { variables: { limit: 10 } });
  const [process, { loading: processing }] = useMutation(PROCESS);
  const [retry, { loading: retrying }] = useMutation(RETRY);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setMsg(null);
    const res = await process({ variables: { limit: 50 } });
    setMsg(`Processed ${res.data?.processOutbox ?? 0} events`);
    await refetch();
    await refetchFailed();
  };
  const runRetry = async () => {
    setMsg(null);
    const res = await retry({ variables: { limit: 100 } });
    setMsg(`Requeued ${res.data?.retryOutboxFailed ?? 0} failed events`);
    await refetch();
    await refetchFailed();
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Outbox</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}><Card><CardContent>
          <Typography>Pending</Typography>
          <Typography variant="h4">{data?.outboxStatus?.pending ?? 0}</Typography>
        </CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent>
          <Typography>Failed</Typography>
          <Typography variant="h4">{data?.outboxStatus?.failed ?? 0}</Typography>
        </CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card><CardContent>
          <Typography>Published</Typography>
          <Typography variant="h4">{data?.outboxStatus?.published ?? 0}</Typography>
        </CardContent></Card></Grid>
      </Grid>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={run} disabled={processing}>Process</Button>
        <Button variant="outlined" onClick={runRetry} disabled={retrying}>Retry Failed</Button>
      </Stack>
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>Last Failed</Typography>
        <Stack spacing={1}>
          {(failed?.lastFailedOutboxEvents ?? []).map((e: any) => (
            <Card key={e.id}><CardContent>
              <Typography variant="subtitle2">{e.type}</Typography>
              <Typography variant="body2" color="text.secondary">{e.lastError}</Typography>
            </CardContent></Card>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

