import { useAssignStoreManagerMutation, useBulkAssignStoreManagerMutation, useCreateStoreWithAddressMutation, useListManagersQuery, useStoresQuery, useStoresWithInvalidManagersLazyQuery } from '../generated/graphql';
import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
  Select,
  MenuItem,
  Box,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AddressAutocompleteField } from '../components/AddressAutocompleteField';
import React, { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';


export default function Stores() {
  const apollo = useApolloClient();
  const [take, setTake] = React.useState(20);
  const [query, setQuery] = React.useState('');
  const [managerFilter, setManagerFilter] = React.useState('');
  const [pendingManagers, setPendingManagers] = React.useState<Record<string,string>>({});
  const vars: any = { take };
  if (query.trim().length >= 2) {
    vars.where = { OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { location: { contains: query, mode: 'insensitive' } },
    ] };
  }
  const { data, loading, error, refetch } = useStoresQuery({ variables: vars, fetchPolicy: 'cache-and-network' as any });
  let list = data?.listStores ?? [];
  if (managerFilter) {
    list = list.filter((s: any) => (s.manager?.id || '') === managerFilter);
  }
  const [runDiag, { data: diag, loading: loadingDiag, error: errorDiag }] = useStoresWithInvalidManagersLazyQuery({ fetchPolicy: 'network-only' as any });
  const [assignOne, { loading: assigningOne }] = useAssignStoreManagerMutation();
  const [assignMany, { loading: assigningMany }] = useBulkAssignStoreManagerMutation();
  const [createStoreMutation, { loading: creatingStore }] = useCreateStoreWithAddressMutation();
  const [mgrId, setMgrId] = React.useState('');
  const { data: mgrsData } = useListManagersQuery({ fetchPolicy: 'cache-first' as any });
  const managers = mgrsData?.listManagers ?? [];

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newStoreName, setNewStoreName] = React.useState('');
  const [newStoreManager, setNewStoreManager] = React.useState('');
  const [newStoreIsMain, setNewStoreIsMain] = React.useState(false);
  const [addressQuery, setAddressQuery] = React.useState('');
  const [addressCountry, setAddressCountry] = React.useState('NG');
  const [addressLabel, setAddressLabel] = React.useState('Primary');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);

  const handleCreateStore = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!newStoreName.trim()) {
      setFormError('Store name is required.');
      return;
    }
    if (!newStoreManager) {
      setFormError('Select a manager for the store.');
      return;
    }
    if (!addressQuery.trim()) {
      setFormError('Enter an address to verify.');
      return;
    }
    try {
      await createStoreMutation({
        variables: {
          data: {
            name: newStoreName.trim(),
            isMain: newStoreIsMain,
            manager: { connect: { id: newStoreManager } },
          },
          address: {
            query: addressQuery.trim(),
            countryCodes: addressCountry.trim() ? [addressCountry.trim().toUpperCase()] : undefined,
            label: addressLabel.trim() || undefined,
            isPrimary: true,
          },
        },
      });
      setFormSuccess('Store created successfully.');
      setCreateOpen(false);
      setNewStoreName('');
      setNewStoreManager('');
      setNewStoreIsMain(false);
      setAddressQuery('');
      setAddressCountry('NG');
      setAddressLabel('Primary');
      await refetch();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create store.');
    }
  };
  // Fallback for React-router-only environment: implement useLazyQuery manually via useApolloClient if needed
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Stores
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage store locations, manager assignments, and diagnostics.
        </Typography>
      </Box>

      <ListingHero
        search={{ value: query, onChange: setQuery, placeholder: 'Search store name or location' }}
        trailing={
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Take"
              type="number"
              size="small"
              value={take}
              onChange={(e) => setTake(Number(e.target.value) || 20)}
              sx={{ width: 120 }}
            />
            <Button variant="outlined" size="small" onClick={() => runDiag?.()} sx={{ borderRadius: 999 }}>
              Check Manager Links
            </Button>
          </Stack>
        }
        action={(
          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" onClick={() => setCreateOpen(true)} sx={{ borderRadius: 999 }}>
              Add Store
            </Button>
            <Button variant="outlined" size="small" onClick={() => refetch()} sx={{ borderRadius: 999 }}>
              Refresh
            </Button>
          </Stack>
        )}
        density="compact"
      />

      {error && <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>{error.message} (click to retry)</Alert>}
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}
      {formSuccess && (
        <Alert severity="success" onClose={() => setFormSuccess(null)}>
          {formSuccess}
        </Alert>
      )}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setFormError(null);
        }}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={handleCreateStore}
      >
        <DialogTitle>Add Store</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Store Name"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              required
              fullWidth
            />
            <Select
              value={newStoreManager}
              onChange={(e) => setNewStoreManager(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
              required
            >
              <MenuItem value="">
                <em>Select manager…</em>
              </MenuItem>
              {managers.map((m: any) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.customerProfile?.fullName ? `${m.customerProfile.fullName} (${m.email})` : m.email}
                </MenuItem>
              ))}
            </Select>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newStoreIsMain}
                  onChange={(e) => setNewStoreIsMain(e.target.checked)}
                />
              }
              label="Mark as main store"
            />
            <AddressAutocompleteField
              value={addressQuery}
              onChange={(text) => {
                setAddressQuery(text);
              }}
              onSelect={(suggestion) => {
                if (suggestion?.countryCode) {
                  setAddressCountry(suggestion.countryCode);
                }
              }}
              countryCode={addressCountry}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Country Code"
                value={addressCountry}
                onChange={(e) => setAddressCountry(e.target.value)}
                helperText="ISO code used to bias geocoding (e.g. NG)"
                sx={{ width: { xs: '100%', sm: 160 } }}
              />
              <TextField
                label="Address Label"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                helperText="Optional label shown in address lists"
                fullWidth
              />
            </Stack>
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false);
              setFormError(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="success" disabled={creatingStore}>
            {creatingStore ? 'Creating…' : 'Create Store'}
          </Button>
        </DialogActions>
      </Dialog>

      {errorDiag && <Alert severity="error">{String(errorDiag.message || errorDiag)}</Alert>}
      {loadingDiag && <Alert severity="info">Checking manager links…</Alert>}
      {!!(diag?.storesWithInvalidManagers?.length) && (
        <>
          <Typography variant="subtitle1">Stores with invalid manager links ({diag.storesWithInvalidManagers.length})</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Select size="small" value={mgrId} onChange={(e) => setMgrId(e.target.value)} displayEmpty sx={{ minWidth: 260 }}>
              <MenuItem value=""><em>Select manager…</em></MenuItem>
              {managers.map((m: any) => (
                <MenuItem key={m.id} value={m.id}>{m.customerProfile?.fullName ? `${m.customerProfile.fullName} (${m.email})` : m.email}</MenuItem>
              ))}
            </Select>
            <Button
              variant="contained"
              disabled={!mgrId || assigningMany}
              onClick={async () => {
                const ids = diag?.storesWithInvalidManagers?.map((s: any) => s.id) || [];
                if (!ids.length) return;
                await assignMany({ variables: { storeIds: ids, managerId: mgrId } });
                await runDiag();
              }}
            >
              {assigningMany ? 'Assigning…' : 'Assign To All'}
            </Button>
          </Stack>
          <TableList
            columns={[
              { key: 'name', label: 'Store', sort: true },
              { key: 'managerId', label: 'Manager ID', sort: true },
              { key: 'actions', label: 'Actions', render: (r: any) => (
                <Button size="small" disabled={!mgrId || assigningOne} onClick={async () => { await assignOne({ variables: { storeId: r.id, managerId: mgrId } }); await runDiag(); }}>
                  {assigningOne ? 'Fixing…' : 'Fix'}
                </Button>
              ) },
            ] as any}
            rows={diag.storesWithInvalidManagers}
            loading={false}
            emptyMessage="All stores have valid managers"
            getRowKey={(r: any) => r.id}
            defaultSortKey="name"
          />
        </>
      )}
      <ListingHero density="compact">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Select size="small" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} displayEmpty sx={{ minWidth: 260, borderRadius: 999 }}>
            <MenuItem value="">
              <em>Filter by manager…</em>
            </MenuItem>
            {managers.map((m: any) => (
              <MenuItem key={m.id} value={m.id}>
                {m.customerProfile?.fullName ? `${m.customerProfile.fullName} (${m.email})` : m.email}
              </MenuItem>
            ))}
          </Select>
          {managerFilter && (
            <Button size="small" onClick={() => setManagerFilter('')}>
              Clear
            </Button>
          )}
        </Stack>
      </ListingHero>
      <TableList
        columns={useMemo(() => ([
          { key: 'name', label: 'Name', sort: true, filter: true },
          { key: 'location', label: 'Location', render: (s: any) => s.primaryAddress?.formattedAddress || s.location || '—', sort: true, filter: true },
          { key: 'isMain', label: 'Is Main', render: (s: any) => s.isMain ? 'Yes' : 'No', sort: true },
          { key: 'manager', label: 'Manager', render: (s: any) => (
            <Select
              size="small"
              value={pendingManagers[s.id] ?? s.manager?.id ?? ''}
              onChange={async (e) => {
                const newId = e.target.value as string;
                setPendingManagers((pm) => ({ ...pm, [s.id]: newId }));
                try {
                  await assignOne({ variables: { storeId: s.id, managerId: newId } });
                } finally {
                  // Optionally refresh to ensure consistency
                  await refetch();
                  setPendingManagers((pm) => { const { [s.id]: _, ...rest } = pm; return rest; });
                }
              }}
              displayEmpty
              fullWidth
            >
              <MenuItem value=""><em>Select manager…</em></MenuItem>
              {managers.map((m: any) => (
                <MenuItem key={m.id} value={m.id}>{m.customerProfile?.fullName ? `${m.customerProfile.fullName} (${m.email})` : m.email}</MenuItem>
              ))}
            </Select>
          ), sort: true, accessor: (s: any) => s.manager?.email || '', filter: true },
        ] as any), [managers, pendingManagers, assignOne, refetch])}
        rows={list}
        loading={loading}
        emptyMessage="No stores"
        getRowKey={(s: any) => s.id}
        defaultSortKey="name"
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="stores"
      />
    </Stack>
  );
}
