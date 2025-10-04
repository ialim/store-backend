import {
  useAdminUpdateCustomerProfileMutation,
  useConsumerReceiptsByCustomerQuery,
  useConsumerSalesByCustomerQuery,
  useCustomerQuery,
  useStoresForCustomersQuery,
} from '../generated/graphql';
import { Alert, Card, CardContent, Grid, Skeleton, Stack, Typography, TextField, MenuItem, Select, Button } from '@mui/material';
import React from 'react';
import { formatMoney } from '../shared/format';
import { useParams } from 'react-router-dom';
import TableList from '../shared/TableList';

export default function CustomerDetail() {
  const params = useParams<{ id?: string }>();
  const id = params.id ?? '';
  const { data, loading, error } = useCustomerQuery({
    variables: { id },
    skip: !params.id,
    fetchPolicy: 'cache-and-network' as any,
    errorPolicy: 'all' as any,
  });
  const profile = data?.findUniqueUser;
  const { data: sData, loading: sLoading, error: sError } = useConsumerSalesByCustomerQuery({ variables: { customerId: id as string, take: 20, skip: 0, order: 'desc' }, skip: !id, fetchPolicy: 'cache-and-network' as any });
  const { data: rData, loading: rLoading, error: rError } = useConsumerReceiptsByCustomerQuery({ variables: { customerId: id as string, take: 20, skip: 0, order: 'desc' }, skip: !id, fetchPolicy: 'cache-and-network' as any });
  const { data: storesData } = useStoresForCustomersQuery({ fetchPolicy: 'cache-first' as any, errorPolicy: 'all' as any });
  const stores = storesData?.listStores ?? [];
  const sales = sData?.consumerSalesByCustomer ?? (profile?.customerProfile?.sales ?? []);
  const fallbackReceipts = React.useMemo(
    () =>
      (profile?.customerProfile?.sales || [])
        .map((s: any) => s?.receipt)
        .filter(Boolean)
        .sort(
          (a: any, b: any) =>
            new Date(b.issuedAt || 0).getTime() -
            new Date(a.issuedAt || 0).getTime(),
        )
        .slice(0, 20),
    [profile?.customerProfile?.sales],
  );
  const receipts = rData?.consumerReceiptsByCustomer ?? fallbackReceipts;
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [updateProfile] = useAdminUpdateCustomerProfileMutation();
  const salesColumns = React.useMemo(
    () =>
      [
        { key: 'id', label: 'ID' },
        {
          key: 'store',
          label: 'Store',
          render: (s: any) => s.store?.name || '—',
          sort: true,
          accessor: (s: any) => s.store?.name || '',
        },
        { key: 'status', label: 'Status', sort: true },
        {
          key: 'createdAt',
          label: 'Created',
          render: (s: any) =>
            s.createdAt ? new Date(s.createdAt).toLocaleString() : '—',
          sort: true,
          accessor: (s: any) => new Date(s.createdAt || 0),
        },
        {
          key: 'totalAmount',
          label: 'Total',
          render: (s: any) => formatMoney(s.totalAmount),
          sort: true,
          accessor: (s: any) => s.totalAmount || 0,
        },
      ] as any,
    [],
  );
  const receiptColumns = React.useMemo(
    () =>
      [
        { key: 'id', label: 'ID' },
        {
          key: 'issuedAt',
          label: 'Issued',
          render: (s: any) =>
            s.issuedAt ? new Date(s.issuedAt).toLocaleString() : '—',
          sort: true,
          accessor: (s: any) => new Date(s.issuedAt || 0),
        },
        { key: 'consumerSaleId', label: 'Sale ID' },
      ] as any,
    [],
  );

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.customerProfile?.fullName || '');
      setEmail(profile.customerProfile?.email || profile.email || '');
      setPhone(profile.customerProfile?.phone || '');
      setStatus(profile.customerProfile?.profileStatus || '');
      setStoreId(profile.customerProfile?.preferredStore?.id || '');
    }
  }, [profile]);

  if (!params.id) return <Alert severity="error">Missing customer id.</Alert>;
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
                if (!id) return;
                try {
                  await updateProfile({
                    variables: {
                      userId: id,
                      input: {
                        fullName: fullName || profile.customerProfile?.fullName || profile.email || 'Customer',
                        email: email || profile.customerProfile?.email || profile.email || '',
                        phone: phone || profile.customerProfile?.phone || null,
                        preferredStoreId: storeId || null,
                        profileStatus: status || null,
                      },
                    },
                  });
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
              columns={salesColumns}
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
              columns={receiptColumns}
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
