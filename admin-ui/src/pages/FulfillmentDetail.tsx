import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import {
  FulfillmentStatus,
  FulfillmentRiderInterestStatus,
  useAssignFulfillmentPersonnelMutation,
  useAssignFulfillmentRiderMutation,
  useFulfillmentRiderInterestsQuery,
  useFulfilmentWorkflowQuery,
  useOrderQuery,
  useRegisterFulfillmentInterestMutation,
  useUpdateFulfillmentStatusMutation,
  useWithdrawFulfillmentInterestMutation,
} from '../generated/graphql';
import { useAuth } from '../shared/AuthProvider';

function formatStatus(status?: FulfillmentStatus | null) {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function riderDisplayName(interest: {
  rider?: {
    email?: string | null;
    customerProfile?: { fullName?: string | null } | null;
  } | null;
  riderId: string;
}) {
  const fullName = interest.rider?.customerProfile?.fullName?.trim();
  if (fullName) return fullName;
  if (interest.rider?.email) return interest.rider.email;
  return interest.riderId;
}

function chipColor(status: FulfillmentRiderInterestStatus) {
  switch (status) {
    case FulfillmentRiderInterestStatus.Active:
      return 'info';
    case FulfillmentRiderInterestStatus.Assigned:
      return 'success';
    case FulfillmentRiderInterestStatus.Withdrawn:
    case FulfillmentRiderInterestStatus.Expired:
      return 'default';
    case FulfillmentRiderInterestStatus.Rejected:
    default:
      return 'warning';
  }
}

export default function FulfillmentDetail() {
  const navigate = useNavigate();
  const { saleOrderId } = useParams<{ saleOrderId: string }>();
  const { hasPermission, hasRole, user } = useAuth();
  const isRider = hasRole('RIDER');
  const isReseller = hasRole('RESELLER');
  const canManage =
    hasPermission('ORDER_READ') || hasRole('BILLER');
  const canAssign = hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER');
  const canViewRiderInterests = hasRole(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'BILLER',
  );

  const [volunteerEta, setVolunteerEta] = useState('');
  const [volunteerMessage, setVolunteerMessage] = useState('');
  const [volunteerCost, setVolunteerCost] = useState('');
  const [personId, setPersonId] = useState('');
  const [statusToSet, setStatusToSet] = useState<FulfillmentStatus>(
    FulfillmentStatus.Assigned,
  );
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: orderData,
    loading: loadingOrder,
    error: orderError,
    refetch: refetchOrder,
  } = useOrderQuery({
    variables: { id: saleOrderId ?? '' },
    skip: !saleOrderId,
    fetchPolicy: 'network-only',
  });

  const order = orderData?.order ?? null;
  const fulfillment = order?.fulfillment ?? null;
  const fulfillmentId = fulfillment?.id ?? null;

  const customerLabel = useMemo(() => {
    const consumer = order?.consumerSale?.customer;
    if (consumer) {
      return consumer.fullName
        ? `${consumer.fullName} (${consumer.email})`
        : consumer.email ?? '—';
    }
    const reseller = order?.resellerSale?.reseller;
    if (reseller) {
      const name = reseller.customerProfile?.fullName;
      return name ? `${name} (${reseller.email})` : reseller.email ?? '—';
    }
    return '—';
  }, [order]);

  const assignedRiderLabel = useMemo(() => {
    if (!fulfillment?.deliveryPersonnelId) return 'Unassigned';
    return riderDisplayName({
      riderId: fulfillment.deliveryPersonnelId,
      rider: {
        email: fulfillment.deliveryPersonnel?.email ?? undefined,
        customerProfile: {
          fullName:
            fulfillment.deliveryPersonnel?.customerProfile?.fullName ?? undefined,
        },
      },
    });
  }, [fulfillment]);

  const {
    data: interestsData,
    loading: loadingInterests,
    refetch: refetchInterests,
  } = useFulfillmentRiderInterestsQuery({
    variables: { saleOrderId: saleOrderId ?? '' },
    skip: !saleOrderId || !canViewRiderInterests,
    fetchPolicy: 'network-only',
  });

  const riderInterests = canViewRiderInterests
    ? interestsData?.fulfillmentRiderInterests ?? []
    : [];

  const activeInterest = useMemo(
    () =>
      riderInterests.find(
        (interest) =>
          interest.riderId === user?.id &&
          interest.status === FulfillmentRiderInterestStatus.Active,
      ) ?? null,
    [riderInterests, user?.id],
  );

  const { data: workflowData, loading: loadingWorkflow } = useFulfilmentWorkflowQuery({
    variables: { saleOrderId: saleOrderId ?? '' },
    skip: !saleOrderId,
    fetchPolicy: 'network-only',
  });

  const [registerInterest, { loading: registeringInterest }] =
    useRegisterFulfillmentInterestMutation();
  const [withdrawInterest, { loading: withdrawingInterest }] =
    useWithdrawFulfillmentInterestMutation();
  const [assignPersonnel, { loading: assigningPersonnel }] =
    useAssignFulfillmentPersonnelMutation();
  const [updateStatusMutation, { loading: updatingStatus }] =
    useUpdateFulfillmentStatusMutation();
  const [assignRiderMutation, { loading: assigningRider }] =
    useAssignFulfillmentRiderMutation();

  const refreshAll = async () => {
    await Promise.all([refetchOrder(), refetchInterests()]);
  };

  const handleVolunteer = async () => {
    if (!fulfillmentId) return;
    setMessage(null);
    setError(null);

    let etaMinutes: number | undefined;
    if (volunteerEta.trim()) {
      const parsed = Number.parseInt(volunteerEta.trim(), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('ETA must be a positive number of minutes.');
        return;
      }
      etaMinutes = parsed;
    }

    let proposedCost: number | undefined;
    if (volunteerCost.trim()) {
      const parsedCost = Number.parseFloat(volunteerCost.trim());
      if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
        setError('Proposed cost must be a positive amount.');
        return;
      }
      proposedCost = parsedCost;
    }

    try {
      await registerInterest({
        variables: {
          input: {
            fulfillmentId,
            etaMinutes,
            message: volunteerMessage.trim() || undefined,
            proposedCost,
          },
        },
      });
      setVolunteerEta('');
      setVolunteerMessage('');
      setVolunteerCost('');
      setMessage('Your interest has been recorded.');
      await refreshAll();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to register interest.');
    }
  };

  const handleWithdraw = async () => {
    if (!fulfillmentId) return;
    setMessage(null);
    setError(null);
    try {
      await withdrawInterest({ variables: { fulfillmentId } });
      setMessage('Interest withdrawn.');
      await refreshAll();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to withdraw interest.');
    }
  };

  const handleAssignRider = async (riderId: string) => {
    if (!fulfillmentId) return;
    setMessage(null);
    setError(null);
    try {
      await assignRiderMutation({
        variables: { input: { fulfillmentId, riderId } },
      });
      setMessage('Assigned rider to fulfillment.');
      await refreshAll();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to assign rider.');
    }
  };

  const handleAssignPersonnel = async () => {
    if (!saleOrderId) return;
    if (!personId.trim()) {
      setError('Delivery personnel ID is required.');
      return;
    }
    setMessage(null);
    setError(null);
    try {
      await assignPersonnel({
        variables: {
          input: {
            saleOrderId,
            deliveryPersonnelId: personId.trim(),
          },
        },
      });
      setMessage('Delivery personnel assigned.');
      await refreshAll();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to assign delivery personnel.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!saleOrderId) return;
    setMessage(null);
    setError(null);
    try {
      await updateStatusMutation({
        variables: {
          input: {
            saleOrderId,
            status: statusToSet,
            confirmationPin: pin.trim() ? pin.trim() : null,
          },
        },
      });
      setMessage('Fulfillment status updated.');
      setPin('');
      await refreshAll();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update status.');
    }
  };

  const workflow = workflowData?.fulfilmentWorkflow ?? null;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="text" onClick={() => navigate('/fulfillments')}>
          ← Back to fulfillments
        </Button>
      </Stack>

      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {(error || orderError) && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error ?? orderError?.message}
        </Alert>
      )}

      {loadingOrder ? (
        <Stack alignItems="center" py={4}>
          <CircularProgress size={28} />
        </Stack>
      ) : order && fulfillment ? (
        <React.Fragment>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Fulfillment for sale order {order.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.type} • {formatStatus(fulfillment.status)}
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Delivery address
                  </Typography>
                  <Typography variant="body1">
                    {fulfillment.deliveryAddress || '—'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned rider
                  </Typography>
                  <Typography variant="body1">{assignedRiderLabel}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer / Reseller
                  </Typography>
                  <Typography variant="body1">{customerLabel}</Typography>
                </Box>
              </Stack>

              <Divider />

              {loadingWorkflow ? (
                <Typography variant="body2" color="text.secondary">
                  Loading workflow timeline…
                </Typography>
              ) : workflow ? (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Workflow
                  </Typography>
                  <Typography variant="body2">
                    Current state: <strong>{workflow.state}</strong>
                  </Typography>
                  {workflow.transitionLogs?.length ? (
                    <Stack spacing={0.5}>
                      {workflow.transitionLogs.slice(0, 5).map((log) => (
                        <Typography key={log.id} variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(log.occurredAt), { addSuffix: true })}: {log.fromState ?? '—'} → {log.toState}
                          {log.event ? ` (${log.event})` : ''}
                        </Typography>
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </Paper>

          {isRider && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Volunteer for this delivery
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Provide an ETA, optional note, and delivery cost proposal.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
                  <TextField
                    label="ETA (minutes)"
                    size="small"
                    value={volunteerEta}
                    onChange={(event) => setVolunteerEta(event.target.value)}
                    sx={{ maxWidth: 160 }}
                  />
                  <TextField
                    label="Message"
                    size="small"
                    value={volunteerMessage}
                    onChange={(event) => setVolunteerMessage(event.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Proposed cost"
                    size="small"
                    value={volunteerCost}
                    onChange={(event) => setVolunteerCost(event.target.value)}
                    sx={{ maxWidth: 180 }}
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleVolunteer}
                    disabled={registeringInterest || !fulfillmentId}
                  >
                    Submit interest
                  </Button>
                  {activeInterest && (
                    <Button
                      variant="text"
                      color="secondary"
                      onClick={handleWithdraw}
                      disabled={withdrawingInterest}
                    >
                      Withdraw
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}

          {canViewRiderInterests && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Rider interests
                </Typography>

                {loadingInterests ? (
                  <Stack alignItems="center" py={3}>
                    <CircularProgress size={24} />
                  </Stack>
                ) : riderInterests.length ? (
                  <Stack spacing={1.5}>
                    {riderInterests.map((interest) => (
                      <Paper
                        key={interest.id}
                        elevation={0}
                        sx={{
                          p: 1.75,
                          borderRadius: 2,
                          border: '1px solid rgba(16, 94, 62, 0.1)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">
                            {riderDisplayName(interest)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted {formatDistanceToNow(new Date(interest.createdAt), { addSuffix: true })}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={interest.status} color={chipColor(interest.status) as any} />
                            {interest.etaMinutes != null && (
                              <Typography variant="caption" color="text.secondary">
                                ETA: {interest.etaMinutes} min
                              </Typography>
                            )}
                            {interest.proposedCost != null && (
                              <Typography variant="caption" color="text.secondary">
                                Cost: {interest.proposedCost}
                              </Typography>
                            )}
                          </Stack>
                          {interest.message && (
                            <Typography variant="body2" color="text.secondary">
                              “{interest.message}”
                            </Typography>
                          )}
                        </Stack>

                        {canAssign && interest.status === FulfillmentRiderInterestStatus.Active && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleAssignRider(interest.riderId)}
                            disabled={assigningRider}
                          >
                            Assign rider
                          </Button>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No riders have registered interest yet.
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}

          {canManage && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Fulfillment administration
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
                  <TextField
                    label="Delivery personnel ID"
                    size="small"
                    value={personId}
                    onChange={(event) => setPersonId(event.target.value)}
                    sx={{ maxWidth: 260 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAssignPersonnel}
                    disabled={assigningPersonnel || !personId.trim()}
                  >
                    Assign personnel
                  </Button>
                </Stack>

                <Divider light />

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
                  <TextField
                    select
                    label="Update status"
                    size="small"
                    value={statusToSet}
                    onChange={(event) =>
                      setStatusToSet(event.target.value as FulfillmentStatus)
                    }
                    sx={{ maxWidth: 220 }}
                    SelectProps={{ native: true }}
                  >
                    {[FulfillmentStatus.Assigned, FulfillmentStatus.InTransit, FulfillmentStatus.Delivered, FulfillmentStatus.Cancelled].map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    label="Confirmation PIN (for delivered)"
                    size="small"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    sx={{ maxWidth: 220 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus}
                  >
                    Apply status
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </React.Fragment>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Fulfillment not found.
        </Typography>
      )}
    </Stack>
  );
}
