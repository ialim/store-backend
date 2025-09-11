import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, Typography, TextField, MenuItem, Select, Button } from '@mui/material';
import React from 'react';
import { formatMoney } from '../shared/format';
import { useParams } from 'react-router-dom';
import TableList from '../shared/TableList';

const GET = gql`
  query Customer($id: String!) {
    findUniqueUser(where: { id: $id }) {
      id
      email
      customerProfile {
        fullName
        email
        phone
        profileStatus
        preferredStore { id name }
        sales {
          id
          status
          totalAmount
          createdAt
          store { id name }
          receipt { id issuedAt consumerSaleId }
        }
      }
    }
  }
`;

const SALES = gql`
  query ConsumerSalesByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String) {
    consumerSalesByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order) {
      id
      status
      totalAmount
      createdAt
      store { id name }
    }
  }
`;

const RECEIPTS = gql`
  query ConsumerReceiptsByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String) {
    consumerReceiptsByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order) {
      id
      issuedAt
      consumerSaleId
    }
  }
`;

const UPDATE = gql`
  mutation AdminUpdateCustomerProfile($userId: String!, $input: AdminUpdateCustomerProfileInput!) {
    adminUpdateCustomerProfile(userId: $userId, input: $input) { userId profileStatus preferredStore { id name } }
  }
`;
const STORES = gql`
  query StoresForCustomer { listStores(take: 200) { id name } }
`;

export default function CustomerDetail() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(GET, { variables: { id }, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
  const profile = data?.findUniqueUser;
  const { data: sData, loading: sLoading, error: sError } = useQuery(SALES, { variables: { customerId: id, take: 20, skip: 0, order: 'desc' }, skip: !id, fetchPolicy: 'cache-and-network' });
  const { data: rData, loading: rLoading, error: rError } = useQuery(RECEIPTS, { variables: { customerId: id, take: 20, skip: 0, order: 'desc' }, skip: !id, fetchPolicy: 'cache-and-network' });
  const { data: storesData } = useQuery(STORES, { fetchPolicy: 'cache-first', errorPolicy: 'all' });
  const stores = storesData?.listStores ?? [];
  const sales = sData?.consumerSalesByCustomer ?? (profile?.customerProfile?.sales ?? []);
  const receipts = rData?.consumerReceiptsByCustomer ?? React.useMemo(
    () => (profile?.customerProfile?.sales || [])
      .map((s: any) => s?.receipt)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime())
      .slice(0, 20),
    [profile?.customerProfile?.sales]
  );
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [updateProfile] = useMutation(UPDATE);

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.customerProfile?.fullName || '');
      setEmail(profile.customerProfile?.email || profile.email || '');
      setPhone(profile.customerProfile?.phone || '');
      setStatus(profile.customerProfile?.profileStatus || '');
      setStoreId(profile.customerProfile?.preferredStore?.id || '');
    }
  }, [profile]);

  if (loading && !profile) return <Skeleton variant="rectangular" height={160} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!profile) return <Alert severity="info">Customer not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{profile.customerProfile?.fullName || profile.email}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Profile</Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <TextField size="small" label="Full Name" value={fullName || profile.customerProfile?.fullName || ''} onChange={(e) => setFullName(e.target.value)} />
              <TextField size="small" label="Email" value={email || profile.customerProfile?.email || profile.email || ''} onChange={(e) => setEmail(e.target.value)} />
              <TextField size="small" label="Phone" value={phone || profile.customerProfile?.phone || ''} onChange={(e) => setPhone(e.target.value)} />
              <Select size="small" value={status || profile.customerProfile?.profileStatus || ''} onChange={(e) => setStatus(e.target.value)} displayEmpty>
                <MenuItem value=""><em>Status…</em></MenuItem>
                {['PENDING','ACTIVE','REJECTED'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
              <Select size="small" value={storeId || ''} onChange={(e) => setStoreId(e.target.value)} displayEmpty>
                <MenuItem value=""><em>Preferred store…</em></MenuItem>
                {stores.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary"><b>User ID:</b> {profile.id}</Typography>
              <Button variant="contained" size="small" onClick={async () => {
                try {
                  await updateProfile({ variables: { userId: id, input: { fullName, email, phone, preferredStoreId: storeId || null, profileStatus: status || null } } });
                  window.location.reload();
                } catch {}
              }}>Save</Button>
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Recent Sales</Typography>
            {/* Using nested sales from profile; no separate error */}
            <TableList
              columns={React.useMemo(() => ([
                { key: 'id', label: 'ID' },
                { key: 'store', label: 'Store', render: (s: any) => s.store?.name || '—', sort: true, accessor: (s: any) => s.store?.name || '' },
                { key: 'status', label: 'Status', sort: true },
                { key: 'createdAt', label: 'Created', render: (s: any) => s.createdAt ? new Date(s.createdAt).toLocaleString() : '—', sort: true, accessor: (s: any) => new Date(s.createdAt || 0) },
                { key: 'totalAmount', label: 'Total', render: (s: any) => formatMoney(s.totalAmount), sort: true, accessor: (s: any) => s.totalAmount || 0 },
              ] as any), [])}
              rows={sales}
              loading={sLoading || loading}
              emptyMessage="No sales"
              getRowKey={(s: any) => s.id}
              defaultSortKey="createdAt"
              showFilters
              globalSearch
              globalSearchPlaceholder="Search sales"
              globalSearchKeys={['id','store','status']}
              enableUrlState
              urlKey="cust_sales"
            />
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" color="text.secondary">Recent Receipts</Typography>
            {/* Using nested receipts derived from sales; no separate error */}
            <TableList
              columns={React.useMemo(() => ([
                { key: 'id', label: 'ID' },
                { key: 'issuedAt', label: 'Issued', render: (s: any) => s.issuedAt ? new Date(s.issuedAt).toLocaleString() : '—', sort: true, accessor: (s: any) => new Date(s.issuedAt || 0) },
                { key: 'consumerSaleId', label: 'Sale ID' },
              ] as any), [])}
              rows={receipts}
              loading={rLoading || loading}
              emptyMessage="No receipts"
              getRowKey={(s: any) => s.id}
              defaultSortKey="issuedAt"
              showFilters
              globalSearch
              globalSearchPlaceholder="Search receipts"
              globalSearchKeys={['id','consumerSaleId']}
              enableUrlState
              urlKey="cust_receipts"
            />
          </CardContent></Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
