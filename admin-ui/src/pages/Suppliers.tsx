import { gql, useQuery } from '@apollo/client';
import { Alert, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

const SUPPLIERS = gql`
  query Suppliers {
    suppliers { id name contactInfo creditLimit currentBalance isFrequent }
  }
`;

export default function Suppliers() {
  const { data, loading, error, refetch } = useQuery(SUPPLIERS, { fetchPolicy: 'cache-and-network' });
  const list = data?.suppliers ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Suppliers</Typography>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      {loading && !list.length ? (
        <Skeleton variant="rectangular" height={120} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Credit</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Flags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((s: any) => {
              let email = '—', phone = '—';
              try { const ci = s.contactInfo || {}; email = ci.email || '—'; phone = ci.phone || '—'; } catch {}
              return (
                <TableRow key={s.id} hover>
                  <TableCell>{s.name || s.id}</TableCell>
                  <TableCell>{email} • {phone}</TableCell>
                  <TableCell>{s.creditLimit ?? 0}</TableCell>
                  <TableCell>{s.currentBalance ?? 0}</TableCell>
                  <TableCell>{s.isFrequent ? 'Frequent' : ''}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
