import { useCreateFacetMutation, useDeleteFacetMutation, useListFacetsAllQuery, useUpdateFacetMutation, useBulkAssignFacetToVariantsMutation, useBulkAssignFacetToProductsMutation, useBulkRemoveFacetFromVariantsMutation, useBulkRemoveFacetFromProductsMutation } from '../generated/graphql';
import { Alert, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { notify } from '../shared/notify';
import React from 'react';
import TableList from '../shared/TableList';

export default function Facets() {
  const { data, loading, error, refetch } = useListFacetsAllQuery({ fetchPolicy: 'cache-and-network' as any });
  const [create] = useCreateFacetMutation();
  const [update] = useUpdateFacetMutation();
  const [del] = useDeleteFacetMutation();
  const list = data?.listFacets ?? [];
  // Bulk assignment state
  const [target, setTarget] = React.useState<'variants'|'products'>('variants');
  const [idsInput, setIdsInput] = React.useState('');
  const [selFacetId, setSelFacetId] = React.useState('');
  const [selValue, setSelValue] = React.useState('');
  const [bulkAssignVariants, { loading: bulkVarLoading }] = useBulkAssignFacetToVariantsMutation();
  const [bulkAssignProducts, { loading: bulkProdLoading }] = useBulkAssignFacetToProductsMutation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [values, setValues] = React.useState('');
  const [bulkRemoveVariants, { loading: bulkVarRemoveLoading }] = useBulkRemoveFacetFromVariantsMutation();
  const [bulkRemoveProducts, { loading: bulkProdRemoveLoading }] = useBulkRemoveFacetFromProductsMutation();
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

      <Card><CardContent>
        <Typography variant="subtitle1">Bulk Facet Assignment</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <Select size="small" value={target} onChange={(e) => setTarget(e.target.value as any)}>
            <MenuItem value="variants">Variants</MenuItem>
            <MenuItem value="products">Products</MenuItem>
          </Select>
          <Select size="small" value={selFacetId} onChange={(e) => { setSelFacetId(e.target.value); setSelValue(''); }} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value=""><em>Select facet…</em></MenuItem>
            {list.map((f: any) => (<MenuItem key={f.id} value={f.id}>{f.name} ({f.code})</MenuItem>))}
          </Select>
          {(() => {
            const f = list.find((x: any) => x.id === selFacetId);
            if (f && Array.isArray(f.values) && f.values.length) {
              return (
                <Select size="small" value={selValue} onChange={(e) => setSelValue(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
                  <MenuItem value=""><em>Value…</em></MenuItem>
                  {f.values.map((v: string) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
                </Select>
              );
            }
            return (<TextField size="small" label="Value" value={selValue} onChange={(e) => setSelValue(e.target.value)} />);
          })()}
        </Stack>
        <TextField
          label={target === 'variants' ? 'Variant IDs (comma/space/newline separated)' : 'Product IDs (comma/space/newline separated)'}
          value={idsInput}
          onChange={(e) => setIdsInput(e.target.value)}
          multiline minRows={3}
          fullWidth sx={{ mt: 1 }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            variant="contained"
            disabled={!selFacetId || !selValue || !idsInput.trim() || bulkVarLoading || bulkProdLoading}
            onClick={async () => {
              const ids = idsInput.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
              if (!ids.length) { notify('Enter at least one ID', 'warning'); return; }
              try {
                if (target === 'variants') {
                  const res = await bulkAssignVariants({ variables: { variantIds: ids, facetId: selFacetId, value: selValue } });
                  notify(`Assigned to ${res.data?.bulkAssignFacetToVariants ?? 0} variant(s)`, 'success');
                } else {
                  const res = await bulkAssignProducts({ variables: { productIds: ids, facetId: selFacetId, value: selValue } });
                  notify(`Assigned to ${res.data?.bulkAssignFacetToProducts ?? 0} product(s)`, 'success');
                }
              } catch (e: any) {
                notify(e?.message || 'Bulk assignment failed', 'error');
              }
            }}
          >Assign</Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!selFacetId || !selValue || !idsInput.trim() || bulkVarRemoveLoading || bulkProdRemoveLoading}
            onClick={async () => {
              const ids = idsInput.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
              if (!ids.length) { notify('Enter at least one ID', 'warning'); return; }
              try {
                if (target === 'variants') {
                  const res = await bulkRemoveVariants({ variables: { variantIds: ids, facetId: selFacetId, value: selValue } });
                  notify(`Removed ${res.data?.bulkRemoveFacetFromVariants ?? 0} assignment(s)`, 'success');
                } else {
                  const res = await bulkRemoveProducts({ variables: { productIds: ids, facetId: selFacetId, value: selValue } });
                  notify(`Removed ${res.data?.bulkRemoveFacetFromProducts ?? 0} assignment(s)`, 'success');
                }
              } catch (e: any) {
                notify(e?.message || 'Bulk removal failed', 'error');
              }
            }}
          >Remove</Button>
          <Button variant="text" onClick={() => { setIdsInput(''); setSelFacetId(''); setSelValue(''); }}>Clear</Button>
        </Stack>
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
