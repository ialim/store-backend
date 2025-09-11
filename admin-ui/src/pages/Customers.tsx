import React from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Alert, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem } from '@mui/material';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';
import { notify } from '../shared/notify';

const CUSTOMERS = gql`
  query Customers($take: Int, $where: UserWhereInput) {
    listUsers(
      take: $take
      where: $where
    ) {
      id
      email
      customerProfile {
        fullName
        email
        phone
        profileStatus
        preferredStore { id name }
      }
    }
  }
`;

export default function Customers() {
  const navigate = useNavigate();
  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [storeFilter, setStoreFilter] = React.useState<string>('');
  const where = React.useMemo(() => {
    const base: any = { role: { is: { name: { equals: 'CUSTOMER' } } } };
    const and: any[] = [base];
    if (statusFilter) and.push({ customerProfile: { is: { profileStatus: { equals: statusFilter } } } });
    if (storeFilter) and.push({ customerProfile: { is: { preferredStoreId: { equals: storeFilter } } } });
    return { AND: and } as any;
  }, [statusFilter, storeFilter]);

  const { data, loading, error, refetch } = useQuery(CUSTOMERS, {
    variables: { take: 100, where },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const list = data?.listUsers ?? [];
  const UPDATE = gql`
    mutation AdminUpdateCustomerProfile($userId: String!, $input: AdminUpdateCustomerProfileInput!) {
      adminUpdateCustomerProfile(userId: $userId, input: $input) { userId profileStatus }
    }
  `;
  const [updateProfile] = useMutation(UPDATE);

  // Create customer modal state
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [preferredStoreId, setPreferredStoreId] = React.useState('');
  const [status, setStatus] = React.useState<'PENDING' | 'ACTIVE' | 'REJECTED'>('ACTIVE');

  const STORES = gql`query StoresForCustomers { listStores(take: 200) { id name } }`;
  const { data: storesData } = useQuery(STORES, { fetchPolicy: 'cache-first' });
  const stores = storesData?.listStores ?? [];

  const CREATE = gql`
    mutation AdminCreateCustomer($input: AdminCreateCustomerInput!) {
      adminCreateCustomer(input: $input) { id email customerProfile { fullName } }
    }
  `;
  const [createCustomer, { loading: creating }] = useMutation(CREATE);
  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rowsToUse = sorted?.length ? sorted : list;
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
    const csv = [header, ...rows].map((r) => r.map((v) => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Typography variant="h5">Customers</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
            <MenuItem value=""><em>Status…</em></MenuItem>
            {['PENDING','ACTIVE','REJECTED'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
          <Select size="small" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value=""><em>Store…</em></MenuItem>
            {stores.map((s: any) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
          {(statusFilter || storeFilter) && (
            <Button size="small" onClick={() => { setStatusFilter(''); setStoreFilter(''); }}>Clear</Button>
          )}
        </Stack>
        <Button variant="contained" onClick={() => setOpen(true)}>New Customer</Button>
      </Stack>
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
                    try { await updateProfile({ variables: { userId: u.id, input: { profileStatus: 'ACTIVE' } } }); notify('Activated customer','success'); await refetch(); } catch (e: any) { notify(e?.message || 'Failed', 'error'); }
                  }}>Activate</Button>
                  <Button size="small" variant="outlined" onClick={async () => {
                    if (!window.confirm('Set this customer to PENDING?')) return;
                    try { await updateProfile({ variables: { userId: u.id, input: { profileStatus: 'PENDING' } } }); notify('Set to pending','info'); await refetch(); } catch (e: any) { notify(e?.message || 'Failed', 'error'); }
                  }}>Set Pending</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!window.confirm('Deactivate (REJECT) this customer?')) return;
                    try { await updateProfile({ variables: { userId: u.id, input: { profileStatus: 'REJECTED' } } }); notify('Customer deactivated','warning'); await refetch(); } catch (e: any) { notify(e?.message || 'Failed', 'error'); }
                  }}>Deactivate</Button>
                  <Button size="small" onClick={() => navigate(`/customers/${u.id}`)}>View</Button>
                </Stack>
              ),
            },
            { key: 'id', label: 'User ID' },
          ] as any,
          [navigate, refetch, updateProfile],
        )}
        rows={list}
        loading={loading}
        emptyMessage="No customers"
        getRowKey={(u: any) => u.id}
        onRowClick={(u: any) => navigate(`/customers/${u.id}`)}
        defaultSortKey="name"
        showFilters
        globalSearch
        globalSearchPlaceholder="Search name/email/phone/store"
        globalSearchKeys={['name', 'email', 'phone', 'store']}
        enableUrlState
        urlKey="customers"
        onExport={exportCsv}
        exportScopeControl
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !email || !password || password.length < 8 || !email.includes('@')}
            onClick={async () => {
              try {
                await createCustomer({ variables: { input: { email, password, fullName: fullName || null, phone: phone || null, preferredStoreId: preferredStoreId || null, profileStatus: status } } });
                notify('Customer created', 'success');
                setOpen(false);
                setEmail(''); setPassword(''); setFullName(''); setPhone(''); setPreferredStoreId(''); setStatus('ACTIVE');
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
