import {
  useActivateResellerMutation,
  useApproveResellerMutation,
  useApplyResellerMutation,
  useListBillersQuery,
  usePendingResellerApplicationsQuery,
  useRejectResellerMutation,
  UserTier,
} from '../generated/graphql';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '../shared/notify';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

export default function ResellerApprovals() {
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const { data, loading, error, refetch } = usePendingResellerApplicationsQuery({
    variables: { take: 50, q: appliedQ },
    fetchPolicy: 'cache-and-network' as any,
  });
  const { data: billersData } = useListBillersQuery({ fetchPolicy: 'cache-first' as any });
  const [approve] = useApproveResellerMutation();
  const [activate] = useActivateResellerMutation();
  const [reject] = useRejectResellerMutation();
  const [applyReseller, { loading: creating }] = useApplyResellerMutation();

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    tier: UserTier.Bronze as UserTier,
    creditLimit: '0',
    requestedBillerId: '',
  });

  const list = data?.pendingResellerApplications ?? [];
  const billers = billersData?.listBillers ?? [];

  // Local edit state per reseller (by userId)
  const [edits, setEdits] = useState<
    Record<
      string,
      { tier?: string; creditLimit?: number; billerId?: string | null }
    >
  >({});
  const getEdit = (row: any) => edits[row.userId] || {};
  const setEdit = (
    row: any,
    patch: Partial<{
      tier: string;
      creditLimit: number;
      billerId: string | null;
    }>,
  ) => {
    setEdits((e) => ({ ...e, [row.userId]: { ...e[row.userId], ...patch } }));
  };

  const onApprove = async (row: any) => {
    const ok = window.confirm(
      `Approve ${row?.user?.email || 'this reseller'}?`,
    );
    if (!ok) return;
    setApprovingId(row.userId);
    setRowError((e) => ({ ...e, [row.userId]: null }));
    const current = getEdit(row);
    const billerId =
      current.billerId ?? row.biller?.id ?? row.requestedBillerId ?? null;
    const tier = current.tier || row.tier;
    const creditLimit = Number(current.creditLimit ?? row.creditLimit);
    try {
      await approve({
        variables: {
          resellerId: row.userId,
          input: { billerId: billerId || null, tier, creditLimit },
        },
      });
      notify(`Approved ${row?.user?.email}`, 'success');
      await refetch({ take: 50, q: appliedQ });
    } catch (e: any) {
      const msg = e?.message || 'Approval failed';
      setRowError((er) => ({ ...er, [row.userId]: msg }));
      notify(msg, 'error');
    }
    setApprovingId(null);
  };

  const onActivate = async (row: any) => {
    const ok = window.confirm(
      `Activate ${row?.user?.email || 'this reseller'}?`,
    );
    if (!ok) return;
    setActivatingId(row.userId);
    setRowError((e) => ({ ...e, [row.userId]: null }));
    const billerId =
      (getEdit(row).billerId ??
        row.biller?.id ??
        row.requestedBillerId ??
        null) ||
      null;
    try {
      await activate({
        variables: { resellerId: row.userId, billerId: billerId || null },
      });
      notify(`Activated ${row?.user?.email}`, 'success');
      await refetch({ take: 50, q: appliedQ });
    } catch (e: any) {
      const msg = e?.message || 'Activation failed';
      setRowError((er) => ({ ...er, [row.userId]: msg }));
      notify(msg, 'error');
    }
    setActivatingId(null);
  };

  const onReject = async (row: any) => {
    const ok = window.confirm(`Reject ${row?.user?.email || 'this reseller'}?`);
    if (!ok) return;
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setRejectingId(row.userId);
    setRowError((e) => ({ ...e, [row.userId]: null }));
    try {
      await reject({ variables: { resellerId: row.userId, reason } });
      notify(`Rejected ${row?.user?.email}`, 'success');
      await refetch({ take: 50, q: appliedQ });
    } catch (e: any) {
      const msg = e?.message || 'Rejection failed';
      setRowError((er) => ({ ...er, [row.userId]: msg }));
      notify(msg, 'error');
    }
    setRejectingId(null);
  };

  const columns = useMemo(
    () => [
      {
        key: 'email',
        label: 'Email',
        render: (row: any) => row.user?.email,
        sort: true,
        accessor: (r: any) => r.user?.email || '',
      },
      {
        key: 'tier',
        label: 'Tier',
        render: (_row: any) => (
          <TextField
            label="Tier"
            value={getEdit(_row).tier || _row.tier}
            onChange={(e) => setEdit(_row, { tier: e.target.value })}
            select
            size="small"
            sx={{ minWidth: 120 }}
          >
            {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        key: 'credit',
        label: 'Credit Limit',
        render: (_row: any) => (
          <TextField
            label="Credit Limit"
            type="number"
            value={getEdit(_row).creditLimit ?? _row.creditLimit}
            onChange={(e) =>
              setEdit(_row, {
                creditLimit:
                  e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            size="small"
            sx={{ maxWidth: 140 }}
          />
        ),
      },
      {
        key: 'requestedBiller',
        label: 'Requested Biller',
        render: (row: any) =>
          row.requestedBiller?.email || row.requestedBillerId || '—',
        sort: true,
        accessor: (r: any) =>
          r.requestedBiller?.email || r.requestedBillerId || '',
      },
      {
        key: 'assignBiller',
        label: 'Assign Biller',
        render: (_row: any) => (
          <Select
            value={
              getEdit(_row).billerId ??
              _row.biller?.id ??
              _row.requestedBillerId ??
              ''
            }
            onChange={(e) =>
              setEdit(_row, { billerId: (e.target.value as string) || null })
            }
            displayEmpty
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">
              <em>No biller</em>
            </MenuItem>
            {billers.map((b: any) => (
              <MenuItem key={b.id} value={b.id}>
                {b.email}
              </MenuItem>
            ))}
          </Select>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row: any) => (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              disabled={approvingId === row.userId}
              onClick={() => onApprove(row)}
            >
              {approvingId === row.userId ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              variant="outlined"
              disabled={activatingId === row.userId}
              onClick={() => onActivate(row)}
            >
              {activatingId === row.userId ? 'Activating…' : 'Activate'}
            </Button>
            <Button
              color="error"
              variant="text"
              disabled={rejectingId === row.userId}
              onClick={() => onReject(row)}
            >
              {rejectingId === row.userId ? 'Rejecting…' : 'Reject'}
            </Button>
          </Stack>
        ),
      },
      // dependencies keep labels/handlers current
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [billers, approvingId, activatingId, rejectingId, edits],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAppliedQ(search.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Reseller Approvals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage pending reseller applications, approvals, and activations.
        </Typography>
      </Box>

      <ListingHero
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by email or biller',
          onSubmit: () => setAppliedQ(search.trim()),
        }}
        action={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => refetch({ take: 50, q: appliedQ })}
              sx={{ borderRadius: 999 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setCreateForm({
                  email: '',
                  password: '',
                  tier: UserTier.Bronze,
                  creditLimit: '0',
                  requestedBillerId: '',
                });
                setCreateOpen(true);
              }}
            >
              New Reseller
            </Button>
          </Stack>
        )}
        density="compact"
      />
      {error && <Alert severity="error">{error.message}</Alert>}
      <TableList
        columns={columns as any}
        rows={list}
        loading={loading}
        emptyMessage="No pending applications"
        getRowKey={(row: any) => row.userId}
        defaultSortKey="email"
        rowsPerPageOptions={[10, 25, 50, 100]}
        showFilters
        globalSearch={false}
        enableUrlState
        urlKey="approvals"
      />
      {Object.values(rowError).some(Boolean) && (
        <Alert severity="error">
          Some actions failed. Check rows for details.
        </Alert>
      )}
      {createOpen && (
        <Dialog open onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Reseller</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextField
                label="Temporary Password"
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
              <TextField
                label="Credit Limit"
                type="number"
                required
                value={createForm.creditLimit}
                onChange={(e) => setCreateForm((f) => ({ ...f, creditLimit: e.target.value }))}
              />
              <TextField
                label="Tier"
                select
                value={createForm.tier}
                onChange={(e) => setCreateForm((f) => ({ ...f, tier: e.target.value as UserTier }))}
              >
                {[UserTier.Bronze, UserTier.Silver, UserTier.Gold, UserTier.Platinum].map((tier) => (
                  <MenuItem key={tier} value={tier}>
                    {tier}
                  </MenuItem>
                ))}
              </TextField>
              <Select
                value={createForm.requestedBillerId}
                onChange={(e) => setCreateForm((f) => ({ ...f, requestedBillerId: e.target.value as string }))}
                displayEmpty
              >
                <MenuItem value="">
                  <em>No requested biller</em>
                </MenuItem>
                {billers.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.email}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={creating || !createForm.email || !createForm.password}
              onClick={async () => {
                try {
                  await applyReseller({
                    variables: {
                      input: {
                        email: createForm.email.trim(),
                        password: createForm.password,
                        creditLimit: Number(createForm.creditLimit) || 0,
                        tier: createForm.tier,
                        requestedBillerId: createForm.requestedBillerId || undefined,
                      },
                    },
                  });
                  notify('Reseller application created', 'success');
                  setCreateOpen(false);
                  await refetch({ take: 50, q: appliedQ });
                } catch (e: any) {
                  notify(e?.message || 'Failed to create reseller', 'error');
                }
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
