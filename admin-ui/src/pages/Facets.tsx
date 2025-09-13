import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Switch, TextField, Typography } from '@mui/material';
import React from 'react';
import TableList from '../shared/TableList';

const LIST = gql`query { listFacets { id name code isPrivate values } }`;
const CREATE = gql`mutation($input: CreateFacetInput!) { createFacet(input: $input) { id } }`;
const UPDATE = gql`mutation($input: UpdateFacetInput!) { updateFacet(input: $input) { id } }`;
const DELETE = gql`mutation($id: String!) { deleteFacet(id: $id) }`;

export default function Facets() {
  const { data, loading, error, refetch } = useQuery(LIST, { fetchPolicy: 'cache-and-network' });
  const [create] = useMutation(CREATE);
  const [update] = useMutation(UPDATE);
  const [del] = useMutation(DELETE);
  const list = data?.listFacets ?? [];
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [values, setValues] = React.useState('');
  const reset = () => { setName(''); setCode(''); setIsPrivate(false); setValues(''); };
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Facets</Typography>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>New Facet</Button>
      </Stack>
      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      <Card><CardContent>
        <TableList
          columns={[
            { key: 'name', label: 'Name', sort: true, filter: true },
            { key: 'code', label: 'Code', sort: true, filter: true },
            { key: 'isPrivate', label: 'Private', render: (r: any) => (r.isPrivate ? 'Yes' : 'No'), sort: true },
            { key: 'values', label: 'Values', render: (r: any) => (Array.isArray(r.values) ? r.values.join(', ') : '—') },
            { key: 'actions', label: 'Actions', render: (r: any) => (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={async () => {
                  const nm = window.prompt('Name', r.name) || r.name;
                  const pv = window.confirm('Private? OK = Yes, Cancel = No');
                  const vs = window.prompt('Comma separated values', (r.values || []).join(',')) || '';
                  await update({ variables: { input: { id: r.id, name: nm, isPrivate: pv, values: vs.split(',').map(s => s.trim()).filter(Boolean) } } });
                  await refetch();
                }}>Edit</Button>
                <Button size="small" color="error" onClick={async () => { if (!window.confirm('Delete this facet?')) return; await del({ variables: { id: r.id } }); await refetch(); }}>Delete</Button>
              </Stack>
            ) },
          ] as any}
          rows={list}
          loading={loading}
          emptyMessage="No facets"
          getRowKey={(r: any) => r.id}
          defaultSortKey="name"
          showFilters
          enableUrlState
          urlKey="facets"
        />
      </CardContent></Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Facet</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
            <Stack direction="row" alignItems="center" spacing={1}><Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> <Typography>Private</Typography></Stack>
            <TextField label="Values (comma-separated)" value={values} onChange={(e) => setValues(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={async () => { await create({ variables: { input: { name, code, isPrivate, values: values.split(',').map(s => s.trim()).filter(Boolean) } } }); reset(); setOpen(false); await refetch(); }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

