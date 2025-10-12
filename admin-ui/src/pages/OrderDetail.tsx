import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useLazyQuery,
  ApolloError,
} from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { formatMoney } from '../shared/format';
import {
  Order,
  UpdateQuotationStatus,
  CreditCheck,
  GrantAdminOverride,
  GrantCreditOverride,
} from '../operations/orders';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS } from '../shared/permissions';

type WorkflowSummary = {
  saleOrderId: string;
  state: string;
  grandTotal: number;
  paid: number;
  outstanding: number;
  creditLimit: number;
  creditExposure: number;
  canAdvanceByPayment: boolean;
  canAdvanceByCredit: boolean;
  context?: any;
};

type OrderData = {
  order: {
    id: string;
    storeId: string;
    billerId: string;
    type: string;
    status: string;
    phase: string;
    saleWorkflowState?: string | null;
    saleWorkflowContext?: any;
    saleWorkflowSummary?: WorkflowSummary | null;
    fulfillmentWorkflowState?: string | null;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    resellerSaleid?: string | null;
    quotation?: {
      id: string;
      status: string;
      type: string;
      totalAmount: number;
      billerId?: string | null;
      resellerId?: string | null;
      updatedAt?: string | null;
      items: Array<{
        productVariantId: string;
        quantity: number;
        unitPrice: number;
      }>;
    } | null;
    fulfillment?: {
      id: string;
      status: string;
      type: string;
      deliveryPersonnelId?: string | null;
      deliveryAddress?: string | null;
      cost?: number | null;
      createdAt: string;
      updatedAt: string;
      fulfillmentWorkflowContext?: any;
      fulfillmentWorkflow?: {
        state: string;
        context?: any;
      } | null;
    } | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusChip(status?: string) {
  const normalized = (status || '').toUpperCase();
  let color: 'default' | 'success' | 'warning' | 'error' = 'default';
  if (['FULFILLED', 'COMPLETED', 'APPROVED'].includes(normalized)) color = 'success';
  else if (['PENDING', 'PROCESSING', 'DRAFT'].includes(normalized)) color = 'warning';
  else if (['CANCELLED', 'REJECTED'].includes(normalized)) color = 'error';
  return <Chip label={status ?? 'Unknown'} color={color} size="small" />;
}

function workflowChip(label: string, state?: string | null) {
  if (!state) return null;
  const normalized = (state || '').toUpperCase();
  let color: 'default' | 'success' | 'warning' | 'error' = 'default';
  if (['CLEARED', 'READY_FOR_SHIPMENT', 'DELIVERED', 'COMPLETED'].includes(normalized)) color = 'success';
  else if (['PENDING_PAYMENT', 'AWAITING_PAYMENT_METHOD', 'ALLOCATING_STOCK', 'PICK_PACK', 'READY_FOR_SHIPMENT'].includes(normalized)) color = 'warning';
  else if (['CANCELLED', 'FAILED', 'RETURN_REQUESTED'].includes(normalized)) color = 'error';
  return <Chip label={`${label}: ${state}`} color={color} size="small" />;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, hasPermission, user } = useAuth();
  const { data, loading, error, refetch } = useQuery<OrderData>(Order, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [workflowSummary, setWorkflowSummary] = React.useState<WorkflowSummary | null>(null);
  const [showAdminOverride, setShowAdminOverride] = React.useState(false);
  const [showCreditOverride, setShowCreditOverride] = React.useState(false);
  const [adminExpiry, setAdminExpiry] = React.useState('');
  const [creditAmount, setCreditAmount] = React.useState('');
  const [creditExpiry, setCreditExpiry] = React.useState('');
  const [updateStatus, { loading: statusUpdating }] = useMutation(
    UpdateQuotationStatus,
  );
  const [grantAdminOverrideMutation, { loading: grantingAdmin }] =
    useMutation(GrantAdminOverride);
  const [grantCreditOverrideMutation, { loading: grantingCredit }] =
    useMutation(GrantCreditOverride);

  type CreditCheckResult = { creditCheck?: WorkflowSummary | null };

  const [runCreditCheck, { loading: creditChecking }] = useLazyQuery<CreditCheckResult>(
    CreditCheck,
    {
      fetchPolicy: 'network-only',
      onCompleted: (result: CreditCheckResult) => {
        if (result?.creditCheck) {
          setWorkflowSummary(result.creditCheck);
          setActionSuccess('Credit snapshot refreshed.');
        }
      },
      onError: (error: ApolloError) => {
        setActionError(
          error?.message || 'Failed to refresh credit snapshot.',
        );
      },
    },
  );

  const order = data?.order;
  React.useEffect(() => {
    if (order?.saleWorkflowSummary) {
      setWorkflowSummary(order.saleWorkflowSummary);
      const outstanding = order.saleWorkflowSummary.outstanding ?? 0;
      setCreditAmount(
        outstanding && Number.isFinite(outstanding)
          ? String(outstanding)
          : '',
      );
    } else {
      setWorkflowSummary(null);
      setCreditAmount('');
    }
  }, [order?.saleWorkflowSummary]);
  const quotation = order?.quotation ?? null;
  const normalizedStatus = (quotation?.status || '').toUpperCase();
  const hasOrderUpdatePermission = hasPermission(
    PERMISSIONS.order.UPDATE ?? 'ORDER_UPDATE',
  );
  const isReseller = hasRole('RESELLER');
  const canUpdateOrder = hasOrderUpdatePermission;
  const ownsQuotation =
    isReseller && quotation?.resellerId && quotation.resellerId === user?.id;
  const isDraft = normalizedStatus === 'DRAFT';
  const isSent = normalizedStatus === 'SENT';
  const canConfirm =
    ownsQuotation && hasOrderUpdatePermission && (isDraft || isSent);
  const canReject =
    ownsQuotation && hasOrderUpdatePermission && (isDraft || isSent);
  const canEditQuotation =
    ownsQuotation && canUpdateOrder && (isDraft || isSent);
  const canGrantOverrides =
    hasPermission(PERMISSIONS.order.APPROVE ?? 'ORDER_APPROVE') &&
    (hasRole('MANAGER') || hasRole('ADMIN') || hasRole('SUPERADMIN'));

  const handleStatusChange = React.useCallback(
    async (status: string) => {
      if (!quotation) return;
      setActionError(null);
      setActionSuccess(null);
      try {
        await updateStatus({
          variables: {
            input: {
              id: quotation.id,
              status,
            },
          },
        });
        await refetch();
        setActionSuccess('Quotation status updated.');
      } catch (mutationErr: any) {
        setActionError(
          mutationErr?.message ||
            'Failed to update order status. Please try again.',
        );
      }
    },
    [quotation, updateStatus, refetch],
  );

  const handleRunCreditCheck = React.useCallback(async () => {
    if (!order?.id) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await runCreditCheck({ variables: { saleOrderId: order.id } });
    } catch (error: any) {
      setActionError(
        error?.message || 'Failed to refresh credit snapshot.',
      );
    }
  }, [order?.id, runCreditCheck]);

  const handleGrantAdminOverride = React.useCallback(async () => {
    if (!order?.id) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await grantAdminOverrideMutation({
        variables: {
          input: {
            saleOrderId: order.id,
            expiresAt: adminExpiry
              ? new Date(adminExpiry).toISOString()
              : null,
          },
        },
      });
      setShowAdminOverride(false);
      setActionSuccess('Admin override approved.');
      await Promise.all([
        refetch(),
        runCreditCheck({ variables: { saleOrderId: order.id } }),
      ]);
    } catch (mutationErr: any) {
      setActionError(
        mutationErr?.message ||
          'Failed to grant admin override. Please try again.',
      );
    }
  }, [
    adminExpiry,
    grantAdminOverrideMutation,
    order?.id,
    refetch,
    runCreditCheck,
  ]);

  const handleGrantCreditOverride = React.useCallback(async () => {
    if (!order?.id) return;
    const amount = parseFloat(creditAmount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Approved amount must be greater than zero.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await grantCreditOverrideMutation({
        variables: {
          input: {
            saleOrderId: order.id,
            approvedAmount: amount,
            expiresAt: creditExpiry
              ? new Date(creditExpiry).toISOString()
              : null,
          },
        },
      });
      setShowCreditOverride(false);
      setActionSuccess('Credit override approved.');
      await Promise.all([
        refetch(),
        runCreditCheck({ variables: { saleOrderId: order.id } }),
      ]);
    } catch (mutationErr: any) {
      setActionError(
        mutationErr?.message ||
          'Failed to grant credit override. Please try again.',
      );
    }
  }, [
    creditAmount,
    creditExpiry,
    grantCreditOverrideMutation,
    order?.id,
    refetch,
    runCreditCheck,
  ]);

  const summaryContext = (workflowSummary?.context ?? {}) as any;
  const adminOverride = summaryContext?.overrides?.admin;
  const creditOverride = summaryContext?.overrides?.credit;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Back to Orders">
            <IconButton onClick={() => navigate('/orders')}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Order Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review key details and fulfillment information for this order.
            </Typography>
          </Box>
        </Stack>
        {quotation && (canConfirm || canReject || canEditQuotation) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            {canEditQuotation && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => navigate(`/orders/quotations/${quotation.id}/edit`)}
              >
                Edit Quotation
              </Button>
            )}
            {canReject && (
              <Button
                variant="outlined"
                color="error"
                disabled={statusUpdating}
                onClick={() => handleStatusChange('REJECTED')}
              >
                Reject Order
              </Button>
            )}
            {canConfirm && (
              <Button
                variant="contained"
                disabled={statusUpdating}
                onClick={() => handleStatusChange('CONFIRMED')}
              >
                Confirm Order
              </Button>
            )}
          </Stack>
        )}
        {order && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRunCreditCheck}
              disabled={creditChecking}
            >
              {creditChecking ? 'Refreshing credit...' : 'Refresh Credit Snapshot'}
            </Button>
            {canGrantOverrides && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setShowAdminOverride(true)}
                  disabled={grantingAdmin || creditChecking}
                >
                  Approve Admin Override
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setShowCreditOverride(true)}
                  disabled={grantingCredit || creditChecking}
                >
                  Approve Credit Override
                </Button>
              </>
            )}
          </Stack>
        )}
      </Stack>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {actionSuccess && (
        <Alert severity="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {loading && !order && (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading order…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (tap to retry)
        </Alert>
      )}

      {order && (
        <>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(16,94,62,0.12)' }}>
            <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {order.id}
              </Typography>
            <Stack direction="row" spacing={1}>
              {statusChip(order.status)}
              {statusChip(order.phase)}
              {workflowChip('Sale', order.saleWorkflowState)}
              {workflowChip('Fulfillment', order.fulfillmentWorkflowState)}
            </Stack>
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Workflow Summary
              </Typography>
              {workflowSummary ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Grand Total
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(workflowSummary.grandTotal)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Captured Payments
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(workflowSummary.paid)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Outstanding Balance
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(workflowSummary.outstanding)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Credit Exposure
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(workflowSummary.creditExposure)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Credit Limit
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(workflowSummary.creditLimit)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Clearance
                    </Typography>
                    <Chip
                      label={
                        workflowSummary.canAdvanceByPayment
                          ? 'Satisfied'
                          : 'Pending'
                      }
                      color={
                        workflowSummary.canAdvanceByPayment
                          ? 'success'
                          : 'warning'
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Credit Clearance
                    </Typography>
                    <Chip
                      label={
                        workflowSummary.canAdvanceByCredit
                          ? 'Available'
                          : 'Not Available'
                      }
                      color={
                        workflowSummary.canAdvanceByCredit
                          ? 'success'
                          : 'warning'
                      }
                      size="small"
                    />
                  </Grid>
                  {adminOverride && (
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Admin Override
                      </Typography>
                      <Chip
                        label={`${adminOverride.status || 'PENDING'}`}
                        color={
                          (adminOverride.status || '')
                            .toUpperCase() === 'APPROVED'
                            ? 'success'
                            : (adminOverride.status || '').toUpperCase() ===
                              'DENIED'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                      {adminOverride.expiresAt && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Expires {formatDate(adminOverride.expiresAt)}
                        </Typography>
                      )}
                    </Grid>
                  )}
                  {creditOverride && (
                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Credit Override
                      </Typography>
                      <Chip
                        label={`${creditOverride.status || 'PENDING'}`}
                        color={
                          (creditOverride.status || '')
                            .toUpperCase() === 'APPROVED'
                            ? 'success'
                            : (creditOverride.status || '').toUpperCase() ===
                              'DENIED'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                      {creditOverride.approvedAmount != null && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Approved {formatMoney(creditOverride.approvedAmount)}
                        </Typography>
                      )}
                      {creditOverride.expiresAt && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Expires {formatDate(creditOverride.expiresAt)}
                        </Typography>
                      )}
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Run a credit snapshot to view payment readiness and overrides
                  status.
                </Typography>
              )}
            </Stack>
            <Divider />
            {quotation && (
              <>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Quotation Overview
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {statusChip(quotation.status)}
                    <Chip label={quotation.type} size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Quotation&nbsp;ID:&nbsp;
                      <Typography component="span" variant="body2">
                        {quotation.id}
                      </Typography>
                    </Typography>
                  </Stack>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Quotation Total
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(quotation.totalAmount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatDate(quotation.updatedAt)}
                    </Typography>
                  </Grid>
                </Grid>
                {quotation.items.length > 0 && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Items
                    </Typography>
                    <Stack spacing={0.5}>
                      {quotation.items.map((item, index) => (
                        <Typography
                          key={`${item.productVariantId}-${index}`}
                          variant="body2"
                          color="text.secondary"
                        >
                          {item.quantity} × {item.productVariantId} @{' '}
                          {formatMoney(item.unitPrice)}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                )}
                <Divider />
              </>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Store
                </Typography>
                <Typography variant="subtitle2">{order.storeId}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Biller
                </Typography>
                <Typography variant="subtitle2">
                  {order.billerId || '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="subtitle2">{order.type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="subtitle2">
                  {formatMoney(order.totalAmount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="subtitle2">
                  {formatDate(order.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="subtitle2">
                  {formatDate(order.updatedAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Reseller Sale ID
                </Typography>
                <Typography variant="subtitle2">
                  {order.resellerSaleid || '—'}
                </Typography>
              </Grid>
            </Grid>
            {order.fulfillment && (
              <>
                <Divider />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Fulfillment
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Fulfillment ID
                    </Typography>
                    <Typography variant="subtitle2">
                      {order.fulfillment.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    {statusChip(order.fulfillment.status)}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Type
                    </Typography>
                    <Typography variant="subtitle2">
                      {order.fulfillment.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Cost
                    </Typography>
                    <Typography variant="subtitle2">
                      {order.fulfillment.cost != null
                        ? formatMoney(order.fulfillment.cost)
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Delivery Personnel
                    </Typography>
                    <Typography variant="subtitle2">
                      {order.fulfillment.deliveryPersonnelId || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Delivery Address
                    </Typography>
                    <Typography variant="subtitle2">
                      {order.fulfillment.deliveryAddress || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Fulfillment Created
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatDate(order.fulfillment.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Fulfillment Updated
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatDate(order.fulfillment.updatedAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </>
            )}
            </Stack>
          </Paper>
          <Dialog
            open={showAdminOverride}
            onClose={() => setShowAdminOverride(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Approve Admin Override</DialogTitle>
            <DialogContent
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Optionally set an expiry for the admin override to
                automatically lapse.
              </Typography>
              <TextField
                label="Expires At"
                type="datetime-local"
                value={adminExpiry}
                onChange={(e) => setAdminExpiry(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAdminOverride(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleGrantAdminOverride}
                disabled={grantingAdmin}
              >
                {grantingAdmin ? 'Approving...' : 'Approve Override'}
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={showCreditOverride}
            onClose={() => setShowCreditOverride(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Approve Credit Override</DialogTitle>
            <DialogContent
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Set the approved credit amount and optional expiry for this
                order.
              </Typography>
              <TextField
                label="Approved Amount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                label="Expires At"
                type="datetime-local"
                value={creditExpiry}
                onChange={(e) => setCreditExpiry(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreditOverride(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleGrantCreditOverride}
                disabled={grantingCredit}
              >
                {grantingCredit ? 'Approving...' : 'Approve Credit'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Stack>
  );
}
