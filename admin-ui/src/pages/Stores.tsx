import { gql, useQuery } from '@apollo/client';
import { Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React from 'react';

const STORES = gql`
  query Stores($take: Int, $where: StoreWhereInput) {
    listStores(take: $take, where: $where) { id name location isMain manager { id email } }
  }
`;

export default function Stores() {
  const [take, setTake] = React.useState(20);
  const [query, setQuery] = React.useState('');
  const vars: any = { take };
  if (query.trim().length >= 2) {
    vars.where = { OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { location: { contains: query, mode: 'insensitive' } },
    ] };
  }
  const { data, loading, error, refetch } = useQuery(STORES, { variables: vars, fetchPolicy: 'cache-and-network' });
  const list = data?.listStores ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Stores</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Take" type="number" size="small" value={take} onChange={(e) => setTake(Number(e.target.value) || 20)} sx={{ width: 120 }} />
        <TextField label="Search (name/location)" size="small" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Stack>
      {loading && !list.length ? (
        <Skeleton variant="rectangular" height={120} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Is Main</TableCell>
              <TableCell>Manager</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((s: any) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.location || '—'}</TableCell>
                <TableCell>{s.isMain ? 'Yes' : 'No'}</TableCell>
                <TableCell>{s.manager?.email || s.manager?.id || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
