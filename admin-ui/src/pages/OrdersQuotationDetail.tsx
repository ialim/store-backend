import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  Alert,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Divider,
  Box,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';
import {
  QuotationDetail,
  QuotationContext,
  ProductVariantsByIds,
  UpdateQuotationStatus,
} from '../operations/orders';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS } from '../shared/permissions';

type QuotationDetailData = {
  quotation: {
    id: string;
    type: string;
    channel: string;
    storeId: string;
    consumerId?: string | null;
    resellerId?: string | null;
    billerId?: string | null;
    status: string;
    totalAmount: number;
    saleOrderId?: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
    }>;
    SaleOrder?: {
      id: string;
      status: string;
      phase: string;
      totalAmount: number;
    } | null;
  };
};

type QuotationContextData = {
  quotationContext?: {
    store?: {
      id: string;
      name?: string | null;
      location?: string | null;
    } | null;
    biller?: {
      id: string;
      email?: string | null;
      fullName?: string | null;
    } | null;
    reseller?: {
      id: string;
      email?: string | null;
      fullName?: string | null;
    } | null;
    consumer?: {
      id: string;
      email?: string | null;
      fullName?: string | null;
    } | null;
  };
};

type ProductVariantsByIdsData = {
  listProductVariants: Array<{
    id: string;
    name?: string | null;
    barcode?: string | null;
    product?: {
      id: string;
      name?: string | null;
    } | null;
  }>;
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
  if (['APPROVED', 'CONFIRMED'].includes(normalized)) color = 'success';
  else if (['REJECTED', 'CANCELLED'].includes(normalized)) color = 'error';
  else if (['DRAFT', 'PENDING'].includes(normalized)) color = 'warning';
  return <Chip label={status ?? 'Unknown'} color={color} size="small" />;
}

export default function OrdersQuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, hasPermission, user } = useAuth();
  const { data, loading, error, refetch } = useQuery<QuotationDetailData>(
    QuotationDetail,
    {
      variables: { id: id ?? '' },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    },
  );
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [updateStatus, { loading: updatingStatus }] = useMutation(
    UpdateQuotationStatus,
  );

  const quotation = data?.quotation;
  const isReseller = hasRole('RESELLER');
  const normalizedStatus = (quotation?.status || '').toUpperCase();
  const privilegedRoles = React.useMemo(
    () => ['SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER'],
    [],
  );
  const orderUpdatePermission =
    PERMISSIONS.order.UPDATE ?? 'ORDER_UPDATE';
  const hasOrderUpdatePermission = hasPermission(orderUpdatePermission);
  const canManageQuotation =
    hasOrderUpdatePermission ||
    privilegedRoles.some((role) => hasRole(role));
  const ownsQuotation =
    isReseller && quotation?.resellerId && quotation.resellerId === user?.id;
  const isCustomer = hasRole('CUSTOMER');
  const ownsConsumerQuotation =
    isCustomer && quotation?.consumerId && quotation.consumerId === user?.id;
  const isDraft = normalizedStatus === 'DRAFT';
  const isSent = normalizedStatus === 'SENT';
  const isConfirmed = normalizedStatus === 'CONFIRMED';
  const isApproved = normalizedStatus === 'APPROVED';
  const editableStatus = isDraft || isSent;
  const privilegedEditor = hasRole('SUPERADMIN', 'ADMIN', 'MANAGER');
  const canEdit =
    quotation &&
    editableStatus &&
    (ownsQuotation || canManageQuotation || privilegedEditor);
  const canApprove =
    quotation && !isReseller && canManageQuotation && !isApproved;
  const approvalReady = isConfirmed;
  const approveDisabled = !approvalReady;
  const approvalTooltip = approveDisabled
    ? 'Quotation must be confirmed before approval'
    : 'Approve quotation and convert to a sale';
  const canRejectStaff =
    quotation && !isReseller && canManageQuotation && (isDraft || isSent);
  const resellerCanConfirm = ownsQuotation && (isDraft || isSent);
  const resellerCanReject = ownsQuotation && (isDraft || isSent);
  const customerCanConfirm = ownsConsumerQuotation && (isDraft || isSent);
  const customerCanReject = ownsConsumerQuotation && (isDraft || isSent);
  const stakeholderCanConfirmBase = resellerCanConfirm || customerCanConfirm;
  const stakeholderCanReject = resellerCanReject || customerCanReject;

  const handleStatusChange = React.useCallback(
    async (status: string) => {
      if (!quotation) return;
      setActionError(null);
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
      } catch (mutationErr: any) {
        setActionError(
          mutationErr?.message ||
            'Failed to update quotation status. Please try again.',
        );
      }
    },
    [quotation, updateStatus, refetch],
  );

  const { data: contextData } = useQuery<QuotationContextData>(QuotationContext, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const context = contextData?.quotationContext;

  const variantIds = React.useMemo(() => {
    if (!quotation) return [] as string[];
    const ids = new Set<string>();
    quotation.items.forEach((item) => {
      if (item.productVariantId) ids.add(item.productVariantId);
    });
    return Array.from(ids);
  }, [quotation]);

  const { data: variantsData } = useQuery<ProductVariantsByIdsData>(ProductVariantsByIds, {
    variables: { ids: variantIds, take: variantIds.length },
    skip: variantIds.length === 0,
  });

  const variantMap = React.useMemo(() => {
    const map: Record<string, ProductVariantsByIdsData['listProductVariants'][number]> = {};
    (variantsData?.listProductVariants ?? []).forEach((variant) => {
      map[variant.id] = variant;
    });
    return map;
  }, [variantsData?.listProductVariants]);

  const storeInfo = context?.store || null;
  const storeLabel = storeInfo
    ? [storeInfo.name, storeInfo.location]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(' • ') || storeInfo.id
    : quotation?.storeId ?? '—';
  const storeIdLabel = storeInfo?.id ?? quotation?.storeId ?? '—';

  const billerInfo = context?.biller || null;
  const resellerInfo = context?.reseller || null;
  const consumerInfo = context?.consumer || null;

  const billerLabel =
    billerInfo?.fullName ||
    billerInfo?.email ||
    quotation?.billerId ||
    '—';
  const billerId = billerInfo?.id ?? quotation?.billerId ?? null;
  const resellerLabel =
    resellerInfo?.fullName ||
    resellerInfo?.email ||
    quotation?.resellerId ||
    '—';
  const consumerLabel =
    consumerInfo?.fullName ||
    consumerInfo?.email ||
    quotation?.consumerId ||
    '—';

  const partyLabel =
    quotation?.type === 'RESELLER' ? resellerLabel : consumerLabel;
  const partyId =
    quotation?.type === 'RESELLER'
      ? resellerInfo?.id || quotation?.resellerId || '—'
      : consumerInfo?.id || quotation?.consumerId || '—';

  const isQuotationBiller = Boolean(
    user?.id && (billerId === user.id || quotation?.billerId === user.id),
  );
  const billerCanConfirm = isQuotationBiller && (isDraft || isSent);
  const stakeholderCanConfirm = stakeholderCanConfirmBase || billerCanConfirm;

  type QuotationItemRow = NonNullable<QuotationDetailData['quotation']>['items'][number];

  const itemColumns = React.useMemo(
    () => [
      {
        key: 'variant',
        label: 'Product Variant',
        render: (row: QuotationItemRow) => {
          const variant = variantMap[row.productVariantId];
          const baseName =
            variant?.name ||
            variant?.product?.name ||
            variant?.barcode ||
            row.productVariantId;
          const details: string[] = [];
          if (
            variant?.barcode &&
            variant?.barcode !== baseName
          ) {
            details.push(variant.barcode);
          }
          if (row.productVariantId && row.productVariantId !== baseName) {
            details.push(`#${row.productVariantId}`);
          }
          return details.length ? `${baseName} (${details.join(' • ')})` : baseName;
        },
      },
      {
        key: 'quantity',
        label: 'Qty',
        render: (row: QuotationItemRow) => row.quantity,
      },
      {
        key: 'price',
        label: 'Unit Price (₦)',
        render: (row: QuotationItemRow) => formatMoney(row.unitPrice),
        align: 'right' as const,
      },
      {
        key: 'total',
        label: 'Line Total (₦)',
        render: (row: QuotationItemRow) =>
          formatMoney(row.unitPrice * row.quantity),
        align: 'right' as const,
      },
    ],
    [variantMap],
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Back to Quotations">
            <IconButton onClick={() => navigate('/orders/quotations')}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Quotation Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review quotation metadata and associated order information.
            </Typography>
          </Box>
        </Stack>
        {quotation &&
          (canEdit ||
            canApprove ||
            canRejectStaff ||
            stakeholderCanConfirm ||
            stakeholderCanReject) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => navigate(`/orders/quotations/${quotation.id}/edit`)}
              >
                Edit Quotation
              </Button>
            )}
            {(canRejectStaff || stakeholderCanReject) && (
              <Button
                variant="outlined"
                color="error"
                disabled={updatingStatus}
                onClick={() => handleStatusChange('REJECTED')}
              >
                Reject
              </Button>
            )}
            {stakeholderCanConfirm && (
              <Button
                variant="contained"
                disabled={updatingStatus}
                onClick={() => handleStatusChange('CONFIRMED')}
              >
                Confirm
              </Button>
            )}
            {canApprove && (
              <Tooltip title={approvalTooltip} disableHoverListener={!approveDisabled}>
                <span>
                  <Button
                    variant="contained"
                    disabled={updatingStatus || approveDisabled}
                    onClick={() => handleStatusChange('APPROVED')}
                  >
                    Approve &amp; Convert
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        )}
      </Stack>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {loading && !quotation && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ py: 6 }}
        >
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading quotation…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (tap to retry)
        </Alert>
      )}

      {quotation && (
        <Paper
          elevation={0}
          sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(16,94,62,0.12)' }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {quotation.id}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {statusChip(quotation.status)}
                <Chip
                  label={quotation.type}
                  size="small"
                  color={quotation.type === 'RESELLER' ? 'primary' : 'default'}
                />
                <Chip label={quotation.channel} size="small" />
                {quotation.saleOrderId && (
                  <Tooltip title="Open related order">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/orders/${quotation.saleOrderId}`)}
                    >
                      <LaunchIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>

            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Store
                </Typography>
                <Typography variant="subtitle2">
                  {storeLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {storeIdLabel}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Biller
                </Typography>
                <Typography variant="subtitle2">
                  {billerLabel}
                </Typography>
                {billerId && (
                  <Typography variant="body2" color="text.secondary">
                    {billerId}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Customer / Reseller
                </Typography>
                <Typography variant="subtitle2">
                  {partyLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {partyId}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="subtitle2">
                  {formatMoney(quotation.totalAmount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="subtitle2">
                  {formatDate(quotation.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="subtitle2">
                  {formatDate(quotation.updatedAt)}
                </Typography>
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Items
            </Typography>
            <TableList
              columns={itemColumns as any}
              rows={quotation.items}
              size="small"
              paginated={false}
              emptyMessage="No items recorded"
            />

            {quotation.SaleOrder && (
              <>
                <Divider />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Related Order
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Order ID
                    </Typography>
                    <Typography variant="subtitle2">
                      {quotation.SaleOrder.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Order Status
                    </Typography>
                    {statusChip(quotation.SaleOrder.status)}
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Phase
                    </Typography>
                    <Typography variant="subtitle2">
                      {quotation.SaleOrder.phase}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Order Total
                    </Typography>
                    <Typography variant="subtitle2">
                      {formatMoney(quotation.SaleOrder.totalAmount)}
                    </Typography>
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
