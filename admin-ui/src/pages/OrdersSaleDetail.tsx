import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LaunchIcon from '@mui/icons-material/Launch';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';
import {
  ConsumerSaleDetail,
  RegisterConsumerPayment,
  RegisterResellerPayment,
  ResellerSaleDetail,
} from '../operations/orders';
import { Stores } from '../operations/stores';
import { useAuth } from '../shared/AuthProvider';
import { PaymentMethod } from '../generated/graphql';
import { getApiBase, getAuthToken } from '../shared/api';

type ConsumerSaleData = {
  consumerSale: {
    id: string;
    saleOrderId: string;
    customerId: string;
    storeId: string;
    billerId: string;
    status: string;
    channel: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    store?: {
      id: string;
      name: string;
      location?: string | null;
    } | null;
    customer?: {
      id: string;
      fullName?: string | null;
      email?: string | null;
      customerProfile?: { fullName?: string | null } | null;
    } | null;
    biller?: {
      id: string;
      email?: string | null;
      customerProfile?: { fullName?: string | null } | null;
    } | null;
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
};

type ResellerSaleData = {
  resellerSale: {
    id: string;
    SaleOrderid: string;
    resellerId: string;
    billerId: string;
    storeId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    store?: {
      id: string;
      name: string;
      location?: string | null;
    } | null;
    reseller?: {
      id: string;
      email?: string | null;
      customerProfile?: { fullName?: string | null } | null;
    } | null;
    biller?: {
      id: string;
      email?: string | null;
      customerProfile?: { fullName?: string | null } | null;
    } | null;
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
};

type StoreListData = {
  listStores: Array<{
    id: string;
    name: string;
    location?: string | null;
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
  if (['FULFILLED', 'COMPLETED', 'PAID'].includes(normalized)) color = 'success';
  else if (['CANCELLED', 'REJECTED'].includes(normalized)) color = 'error';
  else if (['PENDING', 'PROCESSING'].includes(normalized)) color = 'warning';
  return <Chip label={status ?? 'Unknown'} color={color} size="small" />;
}

function formatStoreLabel(
  storeId?: string | null,
  saleStore?: { id: string; name: string; location?: string | null } | null,
  storeMap?: Map<string, string>,
): string {
  if (saleStore) {
    const location = saleStore.location?.trim();
    return location?.length ? `${saleStore.name} • ${location}` : saleStore.name;
  }
  if (!storeId) return '—';
  return storeMap?.get(storeId) ?? storeId;
}

function formatUserLabel(
  user?:
    | {
        fullName?: string | null;
        email?: string | null;
        customerProfile?: { fullName?: string | null } | null;
      }
    | null,
  fallback?: string | null,
) {
  const profileName = user?.customerProfile?.fullName?.trim();
  if (profileName) return profileName;
  const directName = user?.fullName?.trim();
  if (directName) return directName;
  const email = user?.email?.trim();
  if (email) return email;
  return fallback ?? '—';
}

export default function OrdersSaleDetail() {
  const params = useParams<{ kind: string; id: string }>();
  const navigate = useNavigate();
  const { hasRole, user, token } = useAuth();
  const kind = (params.kind || '').toUpperCase();
  const id = params.id ?? '';

  const isConsumer = kind !== 'RESELLER';
  const consumerResult = useQuery<ConsumerSaleData>(ConsumerSaleDetail, {
    variables: { id },
    skip: !isConsumer || !id,
    fetchPolicy: 'cache-and-network',
  });
  const resellerResult = useQuery<ResellerSaleData>(ResellerSaleDetail, {
    variables: { id },
    skip: isConsumer || !id,
    fetchPolicy: 'cache-and-network',
  });
  const { data: storesData } = useQuery<StoreListData>(Stores, {
    variables: { take: 500 },
    fetchPolicy: 'cache-first',
  });

  const storeMap = React.useMemo(() => {
    const entries = storesData?.listStores?.map((store) => [
      store.id,
      `${store.name}${store.location ? ` • ${store.location}` : ''}`,
    ]) as Array<[string, string]> | undefined;
    return new Map(entries ?? []);
  }, [storesData]);

  const [registerConsumerPayment, { loading: registeringConsumer }] =
    useMutation(RegisterConsumerPayment);
  const [registerResellerPayment, { loading: registeringReseller }] =
    useMutation(RegisterResellerPayment);

  const loading = consumerResult.loading || resellerResult.loading;
  const error = consumerResult.error || resellerResult.error;

  const consumerSale = consumerResult.data?.consumerSale;
  const resellerSale = resellerResult.data?.resellerSale;
  const sale = isConsumer ? consumerSale : resellerSale;

  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.Transfer,
  );
  const [paymentReference, setPaymentReference] = React.useState('');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [receiptUploadError, setReceiptUploadError] = React.useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = React.useState(false);

  const saleOrderId = isConsumer
    ? consumerSale?.saleOrderId
    : resellerSale?.SaleOrderid;
  const partyId = isConsumer
    ? consumerSale?.customerId
    : resellerSale?.resellerId;
  const channel = isConsumer ? consumerSale?.channel : 'RESELLER';

  const storeLabel = formatStoreLabel(
    sale?.storeId,
    sale?.store ?? null,
    storeMap,
  );
  const billerLabel = formatUserLabel(
    sale?.biller,
    sale?.billerId ?? undefined,
  );
  const partyLabel = isConsumer
    ? formatUserLabel(
        consumerSale?.customer,
        consumerSale?.customerId ?? undefined,
      )
    : formatUserLabel(
        resellerSale?.reseller,
        resellerSale?.resellerId ?? undefined,
      );

  const itemRows = sale?.items ?? [];
  const itemColumns = React.useMemo(
    () => [
      {
        key: 'variant',
        label: 'Product Variant',
        render: (row: { productVariantId: string }) => row.productVariantId,
      },
      {
        key: 'quantity',
        label: 'Qty',
        render: (row: { quantity: number }) => row.quantity,
      },
      {
        key: 'price',
        label: 'Unit Price (₦)',
        render: (row: { unitPrice: number }) => formatMoney(row.unitPrice),
        align: 'right' as const,
      },
      {
        key: 'total',
        label: 'Line Total (₦)',
        render: (row: { unitPrice: number; quantity: number }) =>
          formatMoney(row.unitPrice * row.quantity),
        align: 'right' as const,
      },
    ],
    [],
  );

  const heading = isConsumer ? 'Consumer Sale Details' : 'Reseller Sale Details';
  const paymentMethods = React.useMemo(
    () => Object.values(PaymentMethod),
    [],
  );
  const isAssignedBiller = Boolean(
    sale?.billerId && user?.id && sale.billerId === user.id,
  );
  const paymentMutationLoading = registeringConsumer || registeringReseller;
  const canRegisterPayment = Boolean(
    sale && hasRole('BILLER') && isAssignedBiller,
  );

  const handleOpenPaymentDialog = React.useCallback(() => {
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentMethod(PaymentMethod.Transfer);
    setActionError(null);
    setActionSuccess(null);
    setReceiptFile(null);
    setReceiptUploadError(null);
    setReceiptUploading(false);
    setShowPaymentDialog(true);
  }, []);

  const handleClosePaymentDialog = React.useCallback(() => {
    setShowPaymentDialog(false);
    setPaymentAmount('');
    setPaymentReference('');
    setReceiptFile(null);
    setReceiptUploadError(null);
    setReceiptUploading(false);
  }, []);

  const handleReceiptSelection = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      setReceiptFile(file);
      setReceiptUploadError(null);
      event.currentTarget.value = '';
    },
    [],
  );

  const handleSubmitPayment = React.useCallback(async () => {
    if (!sale || !saleOrderId) return;
    const amount = Number.parseFloat(paymentAmount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }
    const reference = paymentReference.trim();
    setActionError(null);
    setActionSuccess(null);
    try {
      let receiptPayload: {
        receiptBucket?: string;
        receiptKey?: string;
        receiptUrl?: string;
      } = {};
      if (receiptFile) {
        try {
          setReceiptUploadError(null);
          setReceiptUploading(true);
          const fd = new FormData();
          fd.append('file', receiptFile);
          const headers: Record<string, string> = {};
          const authToken = token ?? getAuthToken();
          if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
          }
          const response = await fetch(`${getApiBase()}/payments/receipts`, {
            method: 'POST',
            body: fd,
            headers,
          });
          if (!response.ok) {
            let message = `Failed to upload receipt (status ${response.status})`;
            try {
              const body = await response.json();
              if (body?.message) message = body.message;
            } catch {
              try {
                const text = await response.text();
                if (text) message = text;
              } catch {}
            }
            throw new Error(message);
          }
          const uploaded = await response.json();
          receiptPayload = {
            receiptBucket:
              uploaded?.bucket ?? uploaded?.receiptBucket ?? undefined,
            receiptKey: uploaded?.key ?? uploaded?.receiptKey ?? undefined,
            receiptUrl: uploaded?.url ?? uploaded?.receiptUrl ?? undefined,
          };
        } catch (uploadErr: any) {
          const message =
            uploadErr?.message || 'Failed to upload receipt. Please try again.';
          setReceiptUploadError(message);
          setActionError(message);
          return;
        } finally {
          setReceiptUploading(false);
        }
      }
      if (isConsumer) {
        if (!consumerSale?.id) {
          setActionError('Missing consumer sale details.');
          return;
        }
        await registerConsumerPayment({
          variables: {
            input: {
              saleOrderId,
              consumerSaleId: consumerSale.id,
              amount,
              method: paymentMethod,
              ...(reference ? { reference } : {}),
              ...receiptPayload,
            },
          },
        });
        await consumerResult.refetch();
      } else {
        if (!resellerSale?.resellerId || !user?.id) {
          setActionError('Missing reseller payment metadata.');
          return;
        }
        await registerResellerPayment({
          variables: {
            input: {
              saleOrderId,
              resellerId: resellerSale.resellerId,
              receivedById: user.id,
              amount,
              method: paymentMethod,
              ...(reference ? { reference } : {}),
              ...(resellerSale.id ? { resellerSaleId: resellerSale.id } : {}),
              ...receiptPayload,
            },
          },
        });
        await resellerResult.refetch();
      }
      setActionSuccess('Payment logged successfully.');
      handleClosePaymentDialog();
    } catch (mutationErr: any) {
      setActionError(mutationErr?.message || 'Failed to log payment.');
    }
  }, [
    sale,
    saleOrderId,
    paymentAmount,
    paymentReference,
    paymentMethod,
    receiptFile,
    token,
    isConsumer,
    consumerSale?.id,
    consumerResult,
    registerConsumerPayment,
    resellerSale?.resellerId,
    resellerSale?.id,
    registerResellerPayment,
    resellerResult,
    user?.id,
    handleClosePaymentDialog,
  ]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <Tooltip title="Back to Sales">
          <IconButton onClick={() => navigate('/orders/sales')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {heading}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inspect sale information and associated order details.
          </Typography>
        </Box>
        {canRegisterPayment && (
          <Box sx={{ ml: 'auto' }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleOpenPaymentDialog}
            >
              Log Payment
            </Button>
          </Box>
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

      {loading && !sale && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ py: 6 }}
        >
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading sale…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" onClick={() => { consumerResult.refetch(); resellerResult.refetch(); }} sx={{ cursor: 'pointer' }}>
          {error.message} (tap to retry)
        </Alert>
      )}

      {sale && (
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
                {sale.id}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {statusChip(sale.status)}
                <Chip
                  label={isConsumer ? 'CONSUMER' : 'RESELLER'}
                  size="small"
                  color={isConsumer ? 'default' : 'primary'}
                />
                {saleOrderId && (
                  <Tooltip title="Open related order">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/orders/${saleOrderId}`)}
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
                <Typography variant="subtitle2">{storeLabel}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Biller
                </Typography>
                <Typography variant="subtitle2">{billerLabel}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Customer / Reseller
                </Typography>
                <Typography variant="subtitle2">{partyLabel || partyId || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="subtitle2">{formatMoney(sale.totalAmount)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="subtitle2">{formatDate(sale.createdAt)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="subtitle2">{formatDate(sale.updatedAt)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Order ID
                </Typography>
                <Typography variant="subtitle2">{saleOrderId || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Channel
                </Typography>
                <Typography variant="subtitle2">{channel || '—'}</Typography>
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Line Items
            </Typography>
            <TableList
              columns={itemColumns as any}
              rows={itemRows}
              size="small"
              paginated={false}
              emptyMessage="No items recorded"
            />
          </Stack>
        </Paper>
      )}

      <Dialog
        open={showPaymentDialog}
        onClose={handleClosePaymentDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Log Payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              autoFocus
              required
            />
            <TextField
              select
              label="Payment Method"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reference"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Optional reference"
            />
            <Stack spacing={0.5}>
              <Button
                component="label"
                variant="outlined"
                disabled={receiptUploading}
              >
                {receiptUploading
                  ? 'Uploading receipt…'
                  : receiptFile
                  ? 'Change receipt'
                  : 'Attach receipt'}
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf,.png,.jpg,.jpeg,.heic"
                  onChange={handleReceiptSelection}
                />
              </Button>
              {receiptFile && !receiptUploading && (
                <Typography variant="caption" color="text.secondary">
                  {receiptFile.name}
                </Typography>
              )}
              {receiptUploadError && (
                <Typography variant="caption" color="error">
                  {receiptUploadError}
                </Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitPayment}
            disabled={paymentMutationLoading || receiptUploading}
          >
            {paymentMutationLoading ? 'Logging…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
