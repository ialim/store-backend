import React from 'react';
import { useAdminCreateCustomerMutation, useAdminUpdateCustomerProfileMutation, useCreateVerifiedAddressMutation, useCustomersQuery, useStoresForCustomersQuery } from '../generated/graphql';
import { Alert, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Box, Typography } from '@mui/material';
import { AddressAutocompleteField } from '../components/AddressAutocompleteField';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';
import { notify } from '../shared/notify';
import { ListingHero } from '../shared/ListingLayout';

export default function Customers() {
  const navigate = useNavigate();
  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [storeFilter, setStoreFilter] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const where = React.useMemo(() => {
    const base: any = { role: { is: { name: { equals: 'CUSTOMER' } } } };
    const and: any[] = [base];
    if (statusFilter) and.push({ customerProfile: { is: { profileStatus: { equals: statusFilter } } } });
    if (storeFilter) and.push({ customerProfile: { is: { preferredStoreId: { equals: storeFilter } } } });
    return { AND: and } as any;
  }, [statusFilter, storeFilter]);

  const { data, loading, error, refetch } = useCustomersQuery({
    variables: { take: 100, where },
    fetchPolicy: 'cache-and-network' as any,
    errorPolicy: 'all',
  });
  const list = data?.listUsers ?? [];
  const [updateProfile] = useAdminUpdateCustomerProfileMutation();

  // Create customer modal state
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [preferredStoreId, setPreferredStoreId] = React.useState('');
  const [status, setStatus] = React.useState<'PENDING' | 'ACTIVE' | 'REJECTED'>('ACTIVE');
  const [addressQuery, setAddressQuery] = React.useState('');
  const [addressCountry, setAddressCountry] = React.useState('NG');
  const [addressError, setAddressError] = React.useState<string | null>(null);

  const { data: storesData } = useStoresForCustomersQuery({ fetchPolicy: 'cache-first' as any });
  const stores = storesData?.listStores ?? [];

  const [createCustomer, { loading: creating }] = useAdminCreateCustomerMutation();
  const [createAddress] = useCreateVerifiedAddressMutation();
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : filteredList;
    if (!rowsToUse?.length) return;
    const header = ['id','name','email','phone','store','status'];
    const rows = rowsToUse.map((u: any) => [
      u.id,
      u.customerProfile?.fullName || (u.email?.split?.('@')?.[0] ?? ''),
      u.customerProfile?.email || u.email || '',
      u.customerProfile?.phone || '',
      u.customerProfile?.preferredStore?.name || '',
      u.customerProfile?.profileStatus || '',
    ]);
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredList = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u: any) => {
      const name = (u.customerProfile?.fullName || u.email || '').toLowerCase();
      const email = (u.customerProfile?.email || u.email || '').toLowerCase();
      const phone = (u.customerProfile?.phone || '').toLowerCase();
      const store = (u.customerProfile?.preferredStore?.name || '').toLowerCase();
      return [name, email, phone, store].some((value) => value.includes(term));
    });
  }, [list, search]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Customers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage customer accounts, statuses, and preferred stores.
        </Typography>
      </Box>
      <ListingHero
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search name, email, phone, or store',
        }}
        action={(
          <Button variant="contained" onClick={() => {
            setOpen(true);
            setAddressError(null);
          }} sx={{ borderRadius: 999 }}>
            New Customer
          </Button>
        )}
        trailing={(
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{ minWidth: 160, borderRadius: 999 }}
            >
              <MenuItem value="">
                <em>Status…</em>
              </MenuItem>
              {['PENDING', 'ACTIVE', 'REJECTED'].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              displayEmpty
              sx={{ minWidth: 220, borderRadius: 999 }}
            >
              <MenuItem value="">
                <em>Store…</em>
              </MenuItem>
              {stores.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
            {(statusFilter || storeFilter) && (
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setStatusFilter('');
                  setStoreFilter('');
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
        )}
        density="compact"
      />
      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (click to retry)
        </Alert>
      )}
      <TableList
        columns={React.useMemo(
          () => [
            {
              key: 'name',
              label: 'Name',
              render: (u: any) => u.customerProfile?.fullName || (u.email?.split?.('@')?.[0] ?? '—'),
              sort: true,
              filter: true,
              accessor: (u: any) => u.customerProfile?.fullName || (u.email || ''),
            },
            {
              key: 'email',
              label: 'Email',
              render: (u: any) => u.customerProfile?.email || u.email,
              sort: true,
              filter: true,
              accessor: (u: any) => u.customerProfile?.email || u.email || '',
            },
            {
              key: 'phone',
              label: 'Phone',
              render: (u: any) => u.customerProfile?.phone || '—',
              sort: true,
              filter: true,
              accessor: (u: any) => u.customerProfile?.phone || '',
            },
            {
              key: 'store',
              label: 'Preferred Store',
              render: (u: any) => u.customerProfile?.preferredStore?.name || '—',
              sort: true,
              accessor: (u: any) => u.customerProfile?.preferredStore?.name || '',
              filter: true,
            },
            {
              key: 'status',
              label: 'Status',
              render: (u: any) => u.customerProfile?.profileStatus || '—',
              sort: true,
              accessor: (u: any) => u.customerProfile?.profileStatus || '',
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (u: any) => (
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={async () => {
                    if (!window.confirm('Activate this customer?')) return;
                    try {
                      await updateProfile({
                        variables: {
                          userId: u.id,
                          input: {
                            fullName: u.customerProfile?.fullName || u.email || 'Customer',
                            profileStatus: 'ACTIVE',
                          },
                        },
                      });
                      notify('Activated customer', 'success');
                      await refetch();
                    } catch (e: any) {
                      notify(e?.message || 'Failed', 'error');
                    }
                  }}>Activate</Button>
                  <Button size="small" variant="outlined" onClick={async () => {
                    if (!window.confirm('Set this customer to PENDING?')) return;
                    try {
                      await updateProfile({
                        variables: {
                          userId: u.id,
                          input: {
                            fullName: u.customerProfile?.fullName || u.email || 'Customer',
                            profileStatus: 'PENDING',
                          },
                        },
                      });
                      notify('Set to pending', 'info');
                      await refetch();
                    } catch (e: any) {
                      notify(e?.message || 'Failed', 'error');
                    }
                  }}>Set Pending</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!window.confirm('Deactivate (REJECT) this customer?')) return;
                    try {
                      await updateProfile({
                        variables: {
                          userId: u.id,
                          input: {
                            fullName: u.customerProfile?.fullName || u.email || 'Customer',
                            profileStatus: 'REJECTED',
                          },
                        },
                      });
                      notify('Customer deactivated', 'warning');
                      await refetch();
                    } catch (e: any) {
                      notify(e?.message || 'Failed', 'error');
                    }
                  }}>Deactivate</Button>
                  <Button size="small" onClick={() => navigate(`/customers/${u.id}`)}>View</Button>
                </Stack>
              ),
            },
            { key: 'id', label: 'User ID' },
          ] as any,
          [navigate, refetch, updateProfile],
        )}
        rows={filteredList}
        loading={loading}
        emptyMessage="No customers"
        getRowKey={(u: any) => u.id}
        onRowClick={(u: any) => navigate(`/customers/${u.id}`)}
        defaultSortKey="name"
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="customers"
        onExport={exportCsv}
        exportScopeControl
      />

      <Dialog open={open} onClose={() => {
        setOpen(false);
        setAddressError(null);
      }} fullWidth maxWidth="sm">
        <DialogTitle>New Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth helperText="Customer login email" error={!!email && !email.includes('@')} />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth helperText="At least 8 characters" error={!!password && password.length < 8} />
            <TextField label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <Select size="small" value={preferredStoreId} onChange={(e) => setPreferredStoreId(e.target.value)} displayEmpty>
              <MenuItem value=""><em>Preferred store…</em></MenuItem>
              {stores.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
            <Select size="small" value={status} onChange={(e) => setStatus(e.target.value as any)} displayEmpty>
              {['PENDING','ACTIVE','REJECTED'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            <AddressAutocompleteField
              label="Primary Address"
              value={addressQuery}
              countryCode={addressCountry}
              onChange={(text) => {
                setAddressQuery(text);
              }}
              onSelect={(suggestion) => {
                if (suggestion?.countryCode) {
                  setAddressCountry(suggestion.countryCode);
                }
              }}
            />
            <TextField
              label="Address Country Code"
              value={addressCountry}
              onChange={(e) => setAddressCountry(e.target.value)}
              fullWidth
              helperText="Used to bias geocoding (default NG)."
            />
            {addressError && <Alert severity="error" onClose={() => setAddressError(null)}>{addressError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !email || !password || password.length < 8 || !email.includes('@')}
            onClick={async () => {
              setAddressError(null);
              try {
                const result = await createCustomer({
                  variables: {
                    input: {
                      email,
                      password,
                      fullName: fullName || null,
                      phone: phone || null,
                      preferredStoreId: preferredStoreId || null,
                      profileStatus: status,
                    },
                  },
                });
                const newUserId = result.data?.adminCreateCustomer?.id;
                if (addressQuery.trim() && newUserId) {
                  try {
                    await createAddress({
                      variables: {
                        input: {
                          query: addressQuery.trim(),
                          countryCodes: addressCountry.trim()
                            ? [addressCountry.trim().toUpperCase()]
                            : undefined,
                          owner: {
                            ownerType: 'User',
                            ownerId: newUserId,
                            label: 'Primary',
                            isPrimary: true,
                          },
                        },
                      },
                    });
                  } catch (addrErr: any) {
                    setAddressError(addrErr?.message || 'Address verification failed.');
                    notify('Customer created but address verification failed', 'warning');
                  }
                }
                notify('Customer created', 'success');
                setOpen(false);
                setEmail(''); setPassword(''); setFullName(''); setPhone(''); setPreferredStoreId(''); setStatus('ACTIVE');
                setAddressQuery('');
                setAddressCountry('NG');
                await refetch();
              } catch (e: any) {
                notify(e?.message || 'Failed to create customer', 'error');
              }
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
