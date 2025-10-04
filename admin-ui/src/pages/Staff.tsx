import {
  useAssignBillerMutation,
  useAssignStoreManagerMutation,
  useCreateStaffMutation,
  useUsersQuery,
  RoleName,
} from '../generated/graphql';
import { Alert, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography, Button } from '@mui/material';
import { UserSelect, StoreSelect } from '../shared/IdSelects';
import React from 'react';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';
import { useNavigate } from 'react-router-dom';


export default function Staff() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<RoleName>(RoleName.Manager);
  const [createStaff, { loading: creating, error: createErr }] = useCreateStaffMutation();

  const [userId, setUserId] = React.useState('');
  const [storeId, setStoreId] = React.useState('');
  const [assignManager, { loading: assigningMgr, error: assignMgrErr }] = useAssignStoreManagerMutation();

  const [billerId, setBillerId] = React.useState('');
  const [resellerId, setResellerId] = React.useState('');
  const [assignBiller, { loading: assigningBiller, error: assignBillerErr }] = useAssignBillerMutation();
  const {
    data: usersData,
    loading: loadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useUsersQuery({ variables: { take: 200 }, fetchPolicy: 'cache-and-network' as any });
  const navigate = useNavigate();
  const staffUsers = React.useMemo(
    () =>
      (usersData?.listUsers ?? []).filter((u) =>
        ['MANAGER', 'ADMIN', 'BILLER'].includes(u.role?.name ?? ''),
      ),
    [usersData?.listUsers],
  );

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await createStaff({ variables: { input: { email, password, role } } });
      notify('Staff account created', 'success');
      setEmail('');
      setPassword('');
      await refetchUsers();
    } catch (err: any) {
      notify(err?.message || 'Failed to create staff', 'error');
    }
  };
  const submitManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !storeId) return;
    try {
      await assignManager({ variables: { storeId, managerId: userId } });
      notify('Store manager assigned', 'success');
      setUserId('');
      setStoreId('');
    } catch (err: any) {
      notify(err?.message || 'Failed to assign store manager', 'error');
    }
  };
  const submitBiller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billerId || !resellerId) return;
    try {
      await assignBiller({ variables: { input: { billerId, resellerId } } });
      notify('Biller assigned to reseller', 'success');
      setBillerId('');
      setResellerId('');
    } catch (err: any) {
      notify(err?.message || 'Failed to assign biller', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Staff</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitCreate}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Create Staff</Typography>
              {createErr && <Alert severity="error">{createErr.message}</Alert>}
              <Stack spacing={1}>
                <TextField label="Email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField label="Password" type="password" size="small" value={password} onChange={(e) => setPassword(e.target.value)} />
                <TextField
                  label="Role"
                  size="small"
                  select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleName)}
                >
                  {[RoleName.Admin, RoleName.Biller, RoleName.Manager].map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>
                <Button type="submit" variant="contained" disabled={creating || !email || !password}>Create</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitManager}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign Store Manager</Typography>
              {assignMgrErr && <Alert severity="error">{assignMgrErr.message}</Alert>}
              <Stack spacing={1}>
                <UserSelect value={userId} onChange={setUserId} />
                <StoreSelect value={storeId} onChange={setStoreId} />
                <Button type="submit" variant="contained" disabled={assigningMgr || !userId || !storeId}>Assign</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card component="form" onSubmit={submitBiller}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign Biller to Reseller</Typography>
              {assignBillerErr && <Alert severity="error">{assignBillerErr.message}</Alert>}
              <Stack spacing={1}>
                <TextField label="Biller User ID" size="small" value={billerId} onChange={(e) => setBillerId(e.target.value)} />
                <TextField label="Reseller User ID" size="small" value={resellerId} onChange={(e) => setResellerId(e.target.value)} />
                <Button type="submit" variant="contained" disabled={assigningBiller || !billerId || !resellerId}>Assign</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="subtitle1">Existing Staff</Typography>
            {usersError && (
              <Alert
                severity="error"
                onClick={() => void refetchUsers()}
                sx={{ cursor: 'pointer' }}
              >
                {usersError.message} (click to retry)
              </Alert>
            )}
            <TableList
              columns={React.useMemo(
                () =>
                  [
                    {
                      key: 'email',
                      label: 'Email',
                      sort: true,
                      filter: true,
                    },
                    {
                      key: 'role',
                      label: 'Role',
                      render: (u: any) => u.role?.name || '—',
                      sort: true,
                      accessor: (u: any) => u.role?.name || '',
                    },
                    {
                      key: 'isEmailVerified',
                      label: 'Verified',
                      render: (u: any) => (u.isEmailVerified ? 'Yes' : 'No'),
                      sort: true,
                      accessor: (u: any) => (u.isEmailVerified ? 1 : 0),
                    },
                    {
                      key: 'createdAt',
                      label: 'Created',
                      render: (u: any) => new Date(u.createdAt).toLocaleString(),
                      sort: true,
                      accessor: (u: any) => new Date(u.createdAt || 0),
                    },
                    {
                      key: 'id',
                      label: 'User ID',
                    },
                  ] as any,
                [],
              )}
              rows={staffUsers}
              loading={loadingUsers}
              emptyMessage="No staff accounts"
              getRowKey={(u: any) => u.id}
              defaultSortKey="email"
              showFilters
              globalSearch
              globalSearchPlaceholder="Search staff"
              globalSearchKeys={['email', 'role', 'id']}
              enableUrlState
              urlKey="staff_list"
              onRowClick={(u: any) => navigate(`/staff/${u.id}`)}
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
