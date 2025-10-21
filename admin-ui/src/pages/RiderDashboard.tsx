import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  FulfillmentRiderInterestStatus,
  FulfillmentStatus,
  useDeliverableFulfillmentsQuery,
  useMyAssignedFulfillmentsQuery,
  useMyFulfillmentInterestsQuery,
} from '../generated/graphql';
import { formatMoney } from '../shared/format';

function formatStatus(status?: FulfillmentStatus | null) {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function formatRelative(value?: string | null) {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

function SummaryCard({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'default';
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: 2.5,
        height: '100%',
        borderColor: (theme) =>
          accent && accent !== 'default'
            ? theme.palette[accent]?.main ?? theme.palette.divider
            : theme.palette.divider,
        background: (theme) =>
          accent && accent !== 'default'
            ? alpha(
                theme.palette[accent]?.main ?? theme.palette.primary.main,
                0.1,
              )
            : theme.palette.background.paper,
      }}
    >
      <Stack spacing={0.75}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function RiderDashboard() {
  const navigate = useNavigate();

  const {
    data: assignedData,
    loading: loadingAssigned,
    error: assignedError,
    refetch: refetchAssigned,
  } = useMyAssignedFulfillmentsQuery({ fetchPolicy: 'cache-and-network' });

  const {
    data: interestsData,
    loading: loadingInterests,
    error: interestsError,
    refetch: refetchInterests,
  } = useMyFulfillmentInterestsQuery({ fetchPolicy: 'cache-and-network' });

  const {
    data: deliverableData,
    loading: loadingDeliverables,
    error: deliverableError,
    refetch: refetchDeliverables,
  } = useDeliverableFulfillmentsQuery({ fetchPolicy: 'cache-and-network' });

  const assigned = assignedData?.myAssignedFulfillments ?? [];
  const interests = interestsData?.myFulfillmentInterests ?? [];
  const available = deliverableData?.deliverableFulfillments ?? [];

  const { activeDeliveries, deliveredCount, totalPaid, outstanding } = useMemo(() => {
    let active = 0;
    let delivered = 0;
    let paid = 0;
    let outstandingTotal = 0;

    for (const fulfillment of assigned) {
      const payments = fulfillment.payments ?? [];
      const totalPayments = payments.reduce(
        (sum, payment) => sum + (payment?.amount ?? 0),
        0,
      );
      paid += totalPayments;
      if (fulfillment.cost != null) {
        const remaining = fulfillment.cost - totalPayments;
        if (remaining > 0) {
          outstandingTotal += remaining;
        }
      }
      switch (fulfillment.status) {
        case FulfillmentStatus.Assigned:
        case FulfillmentStatus.InTransit:
          active += 1;
          break;
        case FulfillmentStatus.Delivered:
          delivered += 1;
          break;
        default:
          break;
      }
    }

    return {
      activeDeliveries: active,
      deliveredCount: delivered,
      totalPaid: paid,
      outstanding: outstandingTotal,
    };
  }, [assigned]);

  const activeInterests = useMemo(
    () =>
      interests.filter(
        (interest) => interest?.status === FulfillmentRiderInterestStatus.Active,
      ).length,
    [interests],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchAssigned(),
      refetchInterests(),
      refetchDeliverables(),
    ]);
  }, [refetchAssigned, refetchInterests, refetchDeliverables]);

  const topAvailable = useMemo(() => available.slice(0, 5), [available]);
  const topActiveDeliveries = useMemo(
    () =>
      assigned
        .filter(
          (item) =>
            item?.status === FulfillmentStatus.Assigned ||
            item?.status === FulfillmentStatus.InTransit,
        )
        .slice(0, 5),
    [assigned],
  );
  const topInterests = useMemo(() => interests.slice(0, 5), [interests]);

  const loading = loadingAssigned || loadingInterests || loadingDeliverables;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Rider dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your assigned deliveries, open opportunities, and fulfillment interests in
            one place.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={refreshAll}
          disabled={loading}
          sx={{ borderRadius: 999 }}
        >
          Refresh
        </Button>
      </Stack>

      {(assignedError || interestsError || deliverableError) && (
        <Alert severity="error">
          {assignedError?.message ||
            interestsError?.message ||
            deliverableError?.message}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Active deliveries"
            value={activeDeliveries}
            description="Currently assigned to you"
            accent="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Delivered"
            value={deliveredCount}
            description="Completed fulfillments"
            accent="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Payout received"
            value={formatMoney(totalPaid)}
            description="Total payments recorded"
            accent="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Outstanding"
            value={formatMoney(outstanding)}
            description="Awaiting payment confirmation"
            accent="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Available deliveries
                </Typography>
                <Chip label={`${available.length} open`} color="primary" size="small" />
              </Stack>
              {loadingDeliverables ? (
                <Stack alignItems="center" py={4}>
                  <CircularProgress size={28} />
                </Stack>
              ) : topAvailable.length ? (
                <Stack spacing={1.5}>
                  {topAvailable.map((item) => {
                    const targetOrderId = item?.saleOrderId ?? '';
                    const handleClick = () => {
                      if (!targetOrderId) return;
                      navigate(`/fulfillments/${targetOrderId}`);
                    };
                    return (
                      <Paper
                        key={item?.id ?? item?.saleOrderId}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          cursor: targetOrderId ? 'pointer' : 'default',
                          opacity: targetOrderId ? 1 : 0.7,
                        }}
                        onClick={handleClick}
                      >
                      <Stack spacing={0.5}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2" color="text.secondary">
                            Order {item?.saleOrderId ?? '—'}
                          </Typography>
                          <Chip size="small" label={formatStatus(item?.status)} color="info" />
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item?.deliveryAddress || 'Delivery address unavailable'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Posted {formatRelative(item?.createdAt)}
                        </Typography>
                      </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  There are currently no new deliveries waiting for assignment.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  My active deliveries
                </Typography>
                <Chip
                  label={`${activeDeliveries} in progress`}
                  color="success"
                  size="small"
                />
              </Stack>
              {loadingAssigned ? (
                <Stack alignItems="center" py={4}>
                  <CircularProgress size={28} />
                </Stack>
              ) : topActiveDeliveries.length ? (
                <Stack spacing={1.5}>
                  {topActiveDeliveries.map((item) => {
                    const targetOrderId =
                      item?.saleOrder?.id ?? item?.saleOrderId ?? '';
                    const handleClick = () => {
                      if (!targetOrderId) return;
                      navigate(`/fulfillments/${targetOrderId}`);
                    };
                    return (
                      <Paper
                        key={item?.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          cursor: targetOrderId ? 'pointer' : 'default',
                          opacity: targetOrderId ? 1 : 0.7,
                        }}
                        onClick={handleClick}
                      >
                      <Stack spacing={0.5}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2" color="text.secondary">
                            Order {item?.saleOrderId ?? '—'}
                          </Typography>
                          <Chip
                            size="small"
                            label={formatStatus(item?.status)}
                            color="primary"
                          />
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {item?.deliveryAddress || 'Delivery address unavailable'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated {formatRelative(item?.updatedAt)}
                        </Typography>
                      </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  You have no active deliveries at the moment.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              My fulfillment interests
            </Typography>
            <Chip label={`${activeInterests} active`} color="warning" size="small" />
          </Stack>
          {loadingInterests ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : interests.length ? (
            <Stack spacing={1.5}>
              {topInterests.map((interest) => {
                const targetOrderId =
                  interest?.fulfillment?.saleOrderId ??
                  interest?.fulfillment?.id ??
                  '';
                const handleClick = () => {
                  if (!targetOrderId) return;
                  navigate(`/fulfillments/${targetOrderId}`);
                };
                return (
                  <Paper
                    key={interest?.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      cursor: targetOrderId ? 'pointer' : 'default',
                      opacity: targetOrderId ? 1 : 0.7,
                    }}
                    onClick={handleClick}
                  >
                  <Stack spacing={0.5}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        Order{' '}
                        {interest?.fulfillment?.saleOrderId ??
                          interest?.fulfillment?.id ??
                          '—'}
                      </Typography>
                      <Chip size="small" label={interest?.status ?? '—'} color="warning" />
                    </Stack>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {interest?.fulfillment?.deliveryAddress ??
                        'Delivery address unavailable'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submitted {formatRelative(interest?.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Proposed cost:{' '}
                      {interest?.proposedCost != null
                        ? formatMoney(interest.proposedCost)
                        : '—'}{' '}
                      • ETA: {interest?.etaMinutes ? `${interest.etaMinutes} min` : '—'}
                    </Typography>
                  </Stack>
                  </Paper>
                );
              })}
              {interests.length > topInterests.length && (
                <Button
                  variant="text"
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={() => navigate('/fulfillments/my')}
                >
                  View all interests and assignments
                </Button>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              You have not registered any interests yet.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
