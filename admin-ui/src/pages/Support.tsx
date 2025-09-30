import { useAdminSendSupportMessageMutation, useMySupportMessagesQuery, useRecentSupportThreadsQuery, useSendSupportMessageMutation, useSupportConversationLazyQuery } from '../generated/graphql';
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import { useAuth } from '../shared/AuthProvider';


export default function Support() {
  const { hasRole } = useAuth();
  const { data: mine, loading: loadingMine, error: errorMine, refetch: refetchMine } = useMySupportMessagesQuery({ fetchPolicy: 'cache-and-network' as any });
  const [send, { loading: sending }] = useSendSupportMessageMutation();
  const [text, setText] = React.useState('');

  const canAdmin = hasRole('SUPERADMIN','ADMIN','MANAGER');
  const { data: recent, loading: loadingRecent, error: errorRecent, refetch: refetchRecent } = useRecentSupportThreadsQuery({ variables: { limit: 10 }, skip: !canAdmin, fetchPolicy: 'cache-and-network' as any });
  const [loadConv, { data: conv, loading: loadingConv, error: errorConv, refetch: refetchConv }] = useSupportConversationLazyQuery();
  const [adminSend, { loading: adminSending }] = useAdminSendSupportMessageMutation();
  const [activeUser, setActiveUser] = React.useState<string | null>(null);
  const [adminText, setAdminText] = React.useState('');

  const submitMine = async (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim()) return;
    await send({ variables: { message: text.trim() } });
    setText(''); await refetchMine();
  };
  const openThread = async (userId: string) => {
    setActiveUser(userId);
    await loadConv({ variables: { userId } });
  };
  const submitAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeUser || !adminText.trim()) return;
    await adminSend({ variables: { userId: activeUser, message: adminText.trim() } });
    setAdminText(''); await refetchConv?.(); await refetchRecent();
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Support</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={canAdmin ? 6 : 12}>
          <Card component="form" onSubmit={submitMine}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>My Messages</Typography>
              {errorMine && <Alert severity="error" onClick={() => refetchMine()} sx={{ cursor: 'pointer' }}>{errorMine.message} (click to retry)</Alert>}
              <Stack spacing={1} sx={{ mb: 2 }}>
                {loadingMine && !(mine?.mySupportMessages?.length) ? (
                  <>
                    <Skeleton variant="text" width={240} />
                    <Skeleton variant="text" width={300} />
                  </>
                ) : (
                  (mine?.mySupportMessages ?? []).map((m: any) => (
                    <Box key={m.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2">{m.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(m.createdAt).toLocaleString()} {m.isAdmin ? '• admin' : ''}</Typography>
                    </Box>
                  ))
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField fullWidth size="small" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
                <Button type="submit" variant="contained" disabled={sending || !text.trim()}>Send</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        {canAdmin && (
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">Recent Threads</Typography>
                  {errorRecent && <Alert severity="error" onClick={() => refetchRecent()} sx={{ cursor: 'pointer' }}>{errorRecent.message} (click to retry)</Alert>}
                  <Stack spacing={1}>
                    {loadingRecent && !(recent?.recentSupportThreads?.length) ? (
                      <>
                        <Skeleton variant="text" width={240} />
                        <Skeleton variant="text" width={300} />
                      </>
                    ) : (
                      (recent?.recentSupportThreads ?? []).map((m: any) => (
                        <Button key={m.id} variant="text" onClick={() => openThread(m.userId)} sx={{ justifyContent: 'flex-start' }}>{m.userId} — {m.message.slice(0, 40)}</Button>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
              {activeUser && (
                <Card component="form" onSubmit={submitAdmin}>
                  <CardContent>
                    <Typography variant="subtitle1">Conversation with {activeUser}</Typography>
                    {errorConv && <Alert severity="error">{errorConv.message}</Alert>}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      {loadingConv && !(conv?.supportConversation?.length) ? (
                        <Skeleton variant="text" width={200} />
                      ) : (
                        (conv?.supportConversation ?? []).map((m: any) => (
                          <Box key={m.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                            <Typography variant="body2">{m.message}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(m.createdAt).toLocaleString()} {m.isAdmin ? '• admin' : ''}</Typography>
                          </Box>
                        ))
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <TextField fullWidth size="small" placeholder="Type a reply" value={adminText} onChange={(e) => setAdminText(e.target.value)} />
                      <Button type="submit" variant="contained" disabled={adminSending || !adminText.trim()}>Send</Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}
