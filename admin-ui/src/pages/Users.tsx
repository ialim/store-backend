import { gql, useQuery } from '@apollo/client';
import { Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

const USERS = gql`
  query Users($take: Int) { listUsers(take: $take) { id email roleId } }
`;

export default function Users() {
  const { data, loading, error, refetch } = useQuery(USERS, { variables: { take: 50 }, fetchPolicy: 'cache-and-network' });
  const list = data?.listUsers ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Users</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      {loading && !list.length ? (
        <Skeleton variant="rectangular" height={120} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role ID</TableCell>
              <TableCell>User ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((u: any) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.roleId || '—'}</TableCell>
                <TableCell>{u.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
