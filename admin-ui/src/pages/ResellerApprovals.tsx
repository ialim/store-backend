import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { notify } from '../shared/notify';
import TableList from '../shared/TableList';

const PENDING = gql`
  query PendingResellerApplications($take: Int, $skip: Int, $q: String) {
    pendingResellerApplications(take: $take, skip: $skip, q: $q) {
      userId
      tier
      creditLimit
      requestedAt
      requestedBillerId
      biller {
        id
        email
      }
      requestedBiller {
        id
        email
      }
      user {
        id
        email
      }
    }
  }
`;

const BILLERS = gql`
  query ListBillers {
    listBillers {
      id
      email
    }
  }
`;

const APPROVE = gql`
  mutation ApproveReseller(
    $resellerId: String!
    $input: ApproveResellerInput!
  ) {
    approveReseller(resellerId: $resellerId, input: $input) {
      userId
      profileStatus
      biller {
        id
        email
      }
    }
  }
`;

const ACTIVATE = gql`
  mutation ActivateReseller($resellerId: String!, $billerId: String) {
    activateReseller(resellerId: $resellerId, billerId: $billerId) {
      userId
      profileStatus
      biller {
        id
        email
      }
    }
  }
`;

const REJECT = gql`
  mutation RejectReseller($resellerId: String!, $reason: String) {
    rejectReseller(resellerId: $resellerId, reason: $reason) {
      userId
      profileStatus
      rejectionReason
    }
  }
`;

export default function ResellerApprovals() {
  const [q, setQ] = useState('');
  const { data, loading, error, refetch } = useQuery(PENDING, {
    variables: { take: 50, q },
    fetchPolicy: 'cache-and-network',
  });
  const { data: billersData } = useQuery(BILLERS, {
    fetchPolicy: 'cache-first',
  });
  const [approve] = useMutation(APPROVE);
  const [activate] = useMutation(ACTIVATE);
  const [reject] = useMutation(REJECT);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string | null>>({});

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
      await refetch();
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
      await refetch();
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
      await refetch();
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

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Reseller Approvals</Typography>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Box>
        <TextField
          size="small"
          label="Search email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') refetch({ q });
          }}
        />
        <Button sx={{ ml: 1 }} onClick={() => refetch({ q })}>
          Search
        </Button>
      </Box>
      <TableList
        columns={columns as any}
        rows={list}
        loading={loading}
        emptyMessage="No pending applications"
        getRowKey={(row: any) => row.userId}
        defaultSortKey="email"
        rowsPerPageOptions={[10, 25, 50, 100]}
        showFilters
        globalSearch
        globalSearchPlaceholder="Search email/biller"
        globalSearchKeys={['email', 'requestedBiller']}
        enableUrlState
        urlKey="approvals"
      />
      {Object.values(rowError).some(Boolean) && (
        <Alert severity="error">
          Some actions failed. Check rows for details.
        </Alert>
      )}
    </Stack>
  );
}
