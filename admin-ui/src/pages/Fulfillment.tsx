import React from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useAssignFulfillmentPersonnelMutation,
  useUpdateFulfillmentStatusMutation,
  FulfillmentStatus,
  useDeliverableFulfillmentsQuery,
  useMyFulfillmentInterestsQuery,
  useRegisterFulfillmentInterestMutation,
  useWithdrawFulfillmentInterestMutation,
  useFulfillmentRiderInterestsLazyQuery,
  useAssignFulfillmentRiderMutation,
  FulfillmentRiderInterestStatus,
} from '../generated/graphql';
import { useState, useMemo, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { FulfilmentWorkflow } from '../operations/orders';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS } from '../shared/permissions';

type FulfilmentWorkflowResult = {
  fulfilmentWorkflow: {
    saleOrderId: string;
    state: string;
    context?: any;
    transitionLogs: Array<{
      id: string;
      fromState?: string | null;
      toState: string;
      event?: string | null;
      occurredAt: string;
    }>;
  } | null;
};

type RiderInterestFormState = Record<string, { eta: string; message: string }>; // keyed by fulfillmentId

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value ?? '—';
  }
}

function riderDisplayName(interest: {
  rider?: {
    email?: string | null;
    customerProfile?: { fullName?: string | null } | null;
    resellerProfile?: { userId: string } | null;
  } | null;
  riderId: string;
}) {
  const fullName = interest.rider?.customerProfile?.fullName;
  if (fullName && fullName.trim()) return fullName;
  if (interest.rider?.email) return interest.rider.email;
  if (interest.rider?.resellerProfile?.userId) {
    return interest.rider.resellerProfile.userId;
  }
  return interest.riderId;
}

function statusChipColor(status: FulfillmentRiderInterestStatus) {
  switch (status) {
    case FulfillmentRiderInterestStatus.Active:
      return 'info';
    case FulfillmentRiderInterestStatus.Assigned:
      return 'success';
    case FulfillmentRiderInterestStatus.Withdrawn:
      return 'default';
    case FulfillmentRiderInterestStatus.Rejected:
    default:
      return 'warning';
  }
}

export default function Fulfillment() {
  const { hasPermission, hasRole } = useAuth();
  const isRider = hasRole('RIDER');
  const canManageFulfilment = hasPermission(
    PERMISSIONS.sale.UPDATE ?? 'SALE_UPDATE',
  );
  const canAssignRiders = hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER');

  const [orderId, setOrderId] = useState('');
  const [personId, setPersonId] = useState('');
  const [status, setStatus] = useState<FulfillmentStatus>(
    FulfillmentStatus.Assigned,
  );
  const [pin, setPin] = useState('');
  const [interestForm, setInterestForm] = useState<RiderInterestFormState>({});
  const [riderInterestsFetchedFor, setRiderInterestsFetchedFor] = useState<
    string | null
  >(null);

  const [assignPersonnel, { loading: assigningPersonnel }] =
    useAssignFulfillmentPersonnelMutation();
  const [updateStatusMutation, { loading: updatingStatus }] =
    useUpdateFulfillmentStatusMutation();
  const [assignRiderMutation, { loading: assigningRider }] =
    useAssignFulfillmentRiderMutation();

  const {
    data: deliverableData,
    loading: loadingDeliverables,
    refetch: refetchDeliverables,
  } = useDeliverableFulfillmentsQuery({ skip: !isRider });
  const {
    data: myInterestsData,
    loading: loadingMyInterests,
    refetch: refetchMyInterests,
  } = useMyFulfillmentInterestsQuery({ skip: !isRider });
  const [registerInterest, { loading: registeringInterest }] =
    useRegisterFulfillmentInterestMutation();
  const [withdrawInterest, { loading: withdrawingInterest }] =
    useWithdrawFulfillmentInterestMutation();
  const [loadRiderInterests, riderInterestsQuery] =
    useFulfillmentRiderInterestsLazyQuery();
  const {
    data: riderInterestsData,
    loading: loadingRiderInterests,
    error: riderInterestsError,
    refetch: refetchRiderInterests,
  } = riderInterestsQuery;

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadWorkflow, {
    data: workflowData,
    loading: loadingWorkflow,
    error: workflowError,
  }] = useLazyQuery<FulfilmentWorkflowResult>(FulfilmentWorkflow, {
    fetchPolicy: 'network-only',
  });

  const workflow = workflowData?.fulfilmentWorkflow ?? null;
  const disableStaffActions = !canManageFulfilment;

  const deliverableFulfillments = useMemo(
    () => deliverableData?.deliverableFulfillments ?? [],
    [deliverableData],
  );
  const myInterests = useMemo(
    () => myInterestsData?.myFulfillmentInterests ?? [],
    [myInterestsData],
  );
  const riderInterests = riderInterestsData?.fulfillmentRiderInterests ?? [];

  useEffect(() => {
    setRiderInterestsFetchedFor(null);
  }, [orderId]);

  const refreshRiderQueries = async () => {
    await Promise.all([
      refetchDeliverables?.(),
      refetchMyInterests?.(),
      refetchRiderInterests?.(),
    ]);
  };

  const handleInterestFieldChange = (
    fulfillmentId: string,
    key: 'eta' | 'message',
    value: string,
  ) => {
    setInterestForm((prev) => ({
      ...prev,
      [fulfillmentId]: {
        eta: key === 'eta' ? value : prev[fulfillmentId]?.eta ?? '',
        message:
          key === 'message' ? value : prev[fulfillmentId]?.message ?? '',
      },
    }));
  };

  const handleRegisterInterest = async (fulfillmentId: string) => {
    setErr(null);
    setMsg(null);
    const form = interestForm[fulfillmentId] ?? { eta: '', message: '' };
    let etaMinutes: number | undefined;
    if (form.eta.trim()) {
      const parsed = Number.parseInt(form.eta.trim(), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErr('ETA must be a positive number of minutes.');
        return;
      }
      etaMinutes = parsed;
    }
    try {
      await registerInterest({
        variables: {
          input: {
            fulfillmentId,
            etaMinutes,
            message: form.message.trim() ? form.message.trim() : undefined,
          },
        },
      });
      setMsg('Thanks! We have recorded your interest.');
      await refreshRiderQueries();
    } catch (error: any) {
      setErr(error?.message || 'Failed to register interest');
    }
  };

  const handleWithdrawInterest = async (fulfillmentId: string) => {
    setErr(null);
    setMsg(null);
    try {
      await withdrawInterest({ variables: { fulfillmentId } });
      setMsg('Interest withdrawn');
      await refreshRiderQueries();
    } catch (error: any) {
      setErr(error?.message || 'Failed to withdraw interest');
    }
  };

  const handleLoadRiderInterests = async () => {
    if (!orderId.trim()) {
      setErr('Enter a sale order ID to view rider interests.');
      return;
    }
    setErr(null);
    setMsg(null);
    await loadRiderInterests({
      variables: { saleOrderId: orderId.trim() },
      fetchPolicy: 'network-only',
    });
    setRiderInterestsFetchedFor(orderId.trim());
  };

  const handleAssignFromInterest = async (
    fulfillmentId: string,
    riderId: string,
  ) => {
    setErr(null);
    setMsg(null);
    try {
      await assignRiderMutation({
        variables: {
          input: {
            fulfillmentId,
            riderId,
          },
        },
      });
      setMsg('Assigned rider to fulfillment');
      await Promise.all([
        refetchRiderInterests?.(),
        refetchDeliverables?.(),
      ]);
    } catch (error: any) {
      setErr(error?.message || 'Failed to assign rider');
    }
  };

  const doAssignPersonnel = async () => {
    setErr(null);
    setMsg(null);
    if (!orderId.trim() || !personId.trim()) {
      setErr('Order ID and delivery personnel ID are required');
      return;
    }
    try {
      await assignPersonnel({
        variables: {
          input: {
            saleOrderId: orderId.trim(),
            deliveryPersonnelId: personId.trim(),
          },
        },
      });
      setMsg('Assigned delivery personnel');
    } catch (error: any) {
      setErr(error?.message || 'Failed to assign delivery personnel');
    }
  };

  const doUpdateStatus = async () => {
    setErr(null);
    setMsg(null);
    if (!orderId.trim()) {
      setErr('Order ID is required');
      return;
    }
    try {
      await updateStatusMutation({
        variables: {
          input: {
            saleOrderId: orderId.trim(),
            status,
            confirmationPin: pin.trim() ? pin.trim() : null,
          },
        },
      });
      setMsg('Updated fulfillment status');
    } catch (error: any) {
      setErr(error?.message || 'Failed to update status');
    }
  };

  const loadingRiderActions = registeringInterest || withdrawingInterest;

  return (
    <Stack spacing={3}>
      {isRider && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h6">Delivery Opportunities</Typography>
              <Typography variant="body2" color="text.secondary">
                Volunteer for deliveries that match your coverage area. A manager will confirm the assignment once selected.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setErr(null);
                    setMsg(null);
                    refreshRiderQueries();
                  }}
                  disabled={loadingDeliverables || loadingMyInterests}
                >
                  {loadingDeliverables || loadingMyInterests
                    ? 'Refreshing…'
                    : 'Refresh'}
                </Button>
              </Stack>
              {loadingDeliverables ? (
                <Stack alignItems="center" py={2}>
                  <CircularProgress size={24} />
                </Stack>
              ) : deliverableFulfillments.length ? (
                <Stack spacing={1.5}>
                  {deliverableFulfillments.map((fulfillment) => {
                    const form = interestForm[fulfillment.id] ?? {
                      eta: '',
                      message: '',
                    };
                    return (
                      <Paper
                        key={fulfillment.id}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 2 }}
                      >
                        <Stack spacing={1}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography variant="subtitle2">
                              Sale Order: {fulfillment.saleOrderId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created {formatDate(fulfillment.createdAt)}
                            </Typography>
                          </Stack>
                          {fulfillment.deliveryAddress && (
                            <Typography variant="body2">
                              Address: {fulfillment.deliveryAddress}
                            </Typography>
                          )}
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                          >
                            <TextField
                              label="ETA (minutes)"
                              type="number"
                              size="small"
                              value={form.eta}
                              onChange={(event) =>
                                handleInterestFieldChange(
                                  fulfillment.id,
                                  'eta',
                                  event.target.value,
                                )
                              }
                              sx={{ maxWidth: 160 }}
                            />
                            <TextField
                              label="Message"
                              size="small"
                              value={form.message}
                              onChange={(event) =>
                                handleInterestFieldChange(
                                  fulfillment.id,
                                  'message',
                                  event.target.value,
                                )
                              }
                              fullWidth
                            />
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              onClick={() => handleRegisterInterest(fulfillment.id)}
                              disabled={loadingRiderActions}
                            >
                              {loadingRiderActions ? 'Submitting…' : 'Volunteer'}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No deliveries currently require a rider. Check back soon!
                </Typography>
              )}
            </Stack>

            <Divider />

            <Stack spacing={1.5}>
              <Typography variant="subtitle1">My Interests</Typography>
              {loadingMyInterests ? (
                <Stack alignItems="center" py={2}>
                  <CircularProgress size={24} />
                </Stack>
              ) : myInterests.length ? (
                <Stack spacing={1.5}>
                  {myInterests.map((interest) => (
                    <Paper
                      key={interest.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography variant="subtitle2">
                            Sale Order: {interest.fulfillment.saleOrderId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted {formatDate(interest.createdAt)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">Status:</Typography>
                          <Chip
                            size="small"
                            label={interest.status}
                            color={statusChipColor(interest.status)}
                          />
                        </Stack>
                        {interest.etaMinutes != null && (
                          <Typography variant="body2">
                            ETA: {interest.etaMinutes} minute(s)
                          </Typography>
                        )}
                        {interest.message && (
                          <Typography variant="body2">
                            Note: {interest.message}
                          </Typography>
                        )}
                        {interest.status === FulfillmentRiderInterestStatus.Active && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              onClick={() =>
                                handleWithdrawInterest(
                                  interest.fulfillment.id,
                                )
                              }
                              disabled={withdrawingInterest}
                            >
                              {withdrawingInterest ? 'Processing…' : 'Withdraw'}
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  You have not volunteered for any deliveries yet.
                </Typography>
              )}
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          {!canManageFulfilment && (
            <Alert severity="info">
              You only have read access to fulfilment actions. Update controls
              are disabled.
            </Alert>
          )}
          <Typography variant="h6">Fulfillment Administration</Typography>
          {msg && <Alert severity="success">{msg}</Alert>}
          {err && <Alert severity="error">{err}</Alert>}
          <TextField
            label="Sale Order ID"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          />
          <TextField
            label="Delivery Personnel ID"
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={doAssignPersonnel}
              disabled={
                disableStaffActions ||
                assigningPersonnel ||
                !orderId.trim() ||
                !personId.trim()
              }
            >
              Assign Personnel
            </Button>
            <Button
              variant="outlined"
              onClick={handleLoadRiderInterests}
              disabled={
                !canAssignRiders ||
                !orderId.trim() ||
                loadingRiderInterests
              }
            >
              {loadingRiderInterests ? 'Loading interests…' : 'Load Rider Interests'}
            </Button>
          </Stack>
          {canAssignRiders && riderInterestsError && (
            <Alert severity="error">{riderInterestsError.message}</Alert>
          )}
          {canAssignRiders && riderInterestsFetchedFor && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">
                Interested Riders for {riderInterestsFetchedFor}
              </Typography>
              {loadingRiderInterests ? (
                <Stack alignItems="center" py={2}>
                  <CircularProgress size={24} />
                </Stack>
              ) : riderInterests.length ? (
                <Stack spacing={1.5}>
                  {riderInterests.map((interest) => (
                    <Paper
                      key={interest.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography variant="subtitle2">
                            Rider: {riderDisplayName(interest)}
                          </Typography>
                          <Chip
                            size="small"
                            label={interest.status}
                            color={statusChipColor(interest.status)}
                          />
                        </Stack>
                        {interest.etaMinutes != null && (
                          <Typography variant="body2">
                            ETA: {interest.etaMinutes} minute(s)
                          </Typography>
                        )}
                        {interest.message && (
                          <Typography variant="body2">
                            Note: {interest.message}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Submitted {formatDate(interest.createdAt)}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() =>
                              handleAssignFromInterest(
                                interest.fulfillmentId,
                                interest.riderId,
                              )
                            }
                            disabled={
                              !canAssignRiders ||
                              assigningRider ||
                              interest.status !== FulfillmentRiderInterestStatus.Active
                            }
                          >
                            {assigningRider ? 'Assigning…' : 'Assign Rider'}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No riders have volunteered for this order yet.
                </Typography>
              )}
            </Stack>
          )}

          <Divider />

          <Select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as FulfillmentStatus)
            }
            size="small"
            displayEmpty
          >
            {[
              FulfillmentStatus.Assigned,
              FulfillmentStatus.InTransit,
              FulfillmentStatus.Delivered,
              FulfillmentStatus.Cancelled,
            ].map((stateValue) => (
              <MenuItem key={stateValue} value={stateValue}>
                {stateValue}
              </MenuItem>
            ))}
          </Select>
          <TextField
            label="Confirmation PIN (optional for DELIVERED)"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              onClick={doUpdateStatus}
              disabled={disableStaffActions || updatingStatus || !orderId.trim()}
            >
              {updatingStatus ? 'Updating…' : 'Update Status'}
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={1} mt={1}>
            <Typography variant="subtitle1">Workflow Snapshot</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                onClick={() => {
                  setErr(null);
                  setMsg(null);
                  if (orderId.trim()) {
                    loadWorkflow({ variables: { saleOrderId: orderId.trim() } });
                  } else {
                    setErr('Enter a sale order ID to inspect the workflow.');
                  }
                }}
                disabled={loadingWorkflow}
              >
                {loadingWorkflow ? 'Loading workflow…' : 'Load Workflow'}
              </Button>
            </Stack>
            {workflowError && (
              <Alert severity="error">{workflowError.message}</Alert>
            )}
            {workflow && (
              <Stack
                spacing={1}
                sx={{
                  border: '1px solid rgba(16,94,62,0.12)',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'grey.50',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Current State
                </Typography>
                <Typography variant="subtitle2">{workflow.state}</Typography>
                {workflow.context && (
                  <Typography
                    component="pre"
                    variant="caption"
                    sx={{
                      m: 0,
                      p: 1,
                      bgcolor: 'common.white',
                      borderRadius: 1,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(workflow.context, null, 2)}
                  </Typography>
                )}
                {workflow.transitionLogs.length > 0 && (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Recent Transitions
                    </Typography>
                    {workflow.transitionLogs.slice(0, 5).map((log) => (
                      <Stack key={log.id} spacing={0.25}>
                        <Typography variant="caption">
                          {formatDate(log.occurredAt)} — {log.fromState ?? '—'} →{' '}
                          {log.toState}
                        </Typography>
                        {log.event && (
                          <Typography variant="caption" color="text.secondary">
                            Event: {log.event}
                          </Typography>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
