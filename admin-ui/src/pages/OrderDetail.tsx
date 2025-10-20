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
  MenuItem,
  Link,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { formatMoney } from '../shared/format';
import {
  Order,
  UpdateQuotationStatus,
  CreditCheck,
  GrantAdminOverride,
  GrantCreditOverride,
  RegisterConsumerPayment,
  RegisterResellerPayment,
  ConfirmConsumerPayment,
  ConfirmResellerPayment,
  UpdateFulfillmentPreferences,
} from '../operations/orders';
import { Stores } from '../operations/stores';
import { useAuth } from '../shared/AuthProvider';
import { getApiBase, getAuthToken } from '../shared/api';
import { PERMISSIONS } from '../shared/permissions';
import { PaymentMethod } from '../generated/graphql';

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

type OrderStoreInfo = {
  id: string;
  name: string;
  location?: string | null;
};

type OrderUserInfo = {
  id: string;
  email?: string | null;
  customerProfile?: { fullName?: string | null } | null;
};

type OrderCustomerInfo = {
  id: string;
  fullName?: string | null;
  email?: string | null;
};

type StoreListData = {
  listStores: Array<{
    id: string;
    name: string;
    location?: string | null;
  }>;
};

type OrderData = {
  order: {
    id: string;
    storeId: string;
    billerId: string;
    type: string;
    status: string;
    phase: string;
    fulfillmentType?: string | null;
    deliveryAddress?: string | null;
    saleWorkflowState?: string | null;
    saleWorkflowContext?: any;
    saleWorkflowSummary?: WorkflowSummary | null;
    fulfillmentWorkflowState?: string | null;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    resellerSaleid?: string | null;
    consumerSale?: {
      id: string;
      status: string;
      store: OrderStoreInfo | null;
      biller: OrderUserInfo | null;
      customer: OrderCustomerInfo | null;
    } | null;
    resellerSale?: {
      id: string;
      status: string;
      resellerId: string;
      reseller: OrderUserInfo | null;
      biller: OrderUserInfo | null;
      store: OrderStoreInfo | null;
    } | null;
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
    ConsumerPayment: Array<{
      id: string;
      amount: number;
      method: PaymentMethod;
      status: string;
      reference?: string | null;
      receivedAt: string;
      receiptBucket?: string | null;
      receiptKey?: string | null;
      receiptUrl?: string | null;
    }>;
    ResellerPayment: Array<{
      id: string;
      amount: number;
      method: PaymentMethod;
      status: string;
      reference?: string | null;
      receivedAt: string;
      resellerId: string;
      receivedById: string;
      receiptBucket?: string | null;
      receiptKey?: string | null;
      receiptUrl?: string | null;
    }>;
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

function paymentStatusChip(status?: string | null) {
  if (!status) return null;
  const normalized = status.toUpperCase();
  let color: 'default' | 'success' | 'warning' | 'error' = 'default';
  if (normalized === 'CONFIRMED') color = 'success';
  else if (normalized === 'PENDING') color = 'warning';
  else if (normalized === 'FAILED') color = 'error';
  return <Chip label={normalized} color={color} size="small" />;
}

function formatUserLabel(user: OrderUserInfo | undefined | null) {
  if (!user) return '—';
  const fullName = user.customerProfile?.fullName?.trim();
  return fullName?.length ? `${fullName} (${user.email ?? 'no email'})` : user.email ?? user.id;
}

function formatCustomerLabel(customer: OrderCustomerInfo | undefined | null) {
  if (!customer) return '—';
  const fullName = customer.fullName?.trim();
  if (fullName?.length && customer.email) {
    return `${fullName} (${customer.email})`;
  }
  return fullName || customer.email || customer.id;
}

function formatStoreLabel(store: OrderStoreInfo | undefined | null, fallback?: string | null) {
  if (!store) return fallback ?? '—';
  const location = store.location?.trim();
  return location?.length ? `${store.name} • ${location}` : store.name;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, hasPermission, user, token } = useAuth();
  const { data, loading, error, refetch } = useQuery<OrderData>(Order, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const canViewStores =
    hasPermission(PERMISSIONS.store.READ ?? 'STORE_READ') ||
    hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER');
  const { data: storesData } = useQuery<StoreListData>(Stores, {
    variables: { take: 500 },
    fetchPolicy: 'cache-first',
    skip: !canViewStores,
  });
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [workflowSummary, setWorkflowSummary] = React.useState<WorkflowSummary | null>(null);
  const [showAdminOverride, setShowAdminOverride] = React.useState(false);
  const [showCreditOverride, setShowCreditOverride] = React.useState(false);
  const [adminExpiry, setAdminExpiry] = React.useState('');
  const [creditAmount, setCreditAmount] = React.useState('');
  const [creditExpiry, setCreditExpiry] = React.useState('');
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.Transfer,
  );
  const [paymentReference, setPaymentReference] = React.useState('');
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = React.useState(false);
  const [receiptUploadError, setReceiptUploadError] = React.useState<string | null>(null);
  const [fulfillmentTypeDraft, setFulfillmentTypeDraft] = React.useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddressDraft, setDeliveryAddressDraft] = React.useState('');
  const [updateStatus, { loading: statusUpdating }] = useMutation(
    UpdateQuotationStatus,
  );
  const [grantAdminOverrideMutation, { loading: grantingAdmin }] =
    useMutation(GrantAdminOverride);
  const [grantCreditOverrideMutation, { loading: grantingCredit }] =
    useMutation(GrantCreditOverride);
  const [registerConsumerPayment, { loading: registeringConsumerPayment }] =
    useMutation(RegisterConsumerPayment);
  const [registerResellerPayment, { loading: registeringResellerPayment }] =
    useMutation(RegisterResellerPayment);
  const [confirmConsumerPaymentMutation, { loading: confirmingConsumerPayment }] =
    useMutation(ConfirmConsumerPayment);
  const [confirmResellerPaymentMutation, { loading: confirmingResellerPayment }] =
    useMutation(ConfirmResellerPayment);
  const [updateFulfillmentPreferencesMutation, { loading: updatingFulfillmentPreferences }] =
    useMutation(UpdateFulfillmentPreferences);

  type CreditCheckResult = { creditCheck?: WorkflowSummary | null };

  const paymentMethodOptions = React.useMemo(
    () => Object.values(PaymentMethod),
    [],
  );
  const paymentMutationLoading =
    registeringConsumerPayment || registeringResellerPayment || receiptUploading;
  const confirmingPayment =
    confirmingConsumerPayment || confirmingResellerPayment;

  const storeMap = React.useMemo(() => {
    const entries = storesData?.listStores?.map((store) => [
      store.id,
      `${store.name}${store.location ? ` • ${store.location}` : ''}`,
    ]) as Array<[string, string]> | undefined;
    return new Map(entries ?? []);
  }, [storesData]);

  const [runCreditCheck, { loading: creditChecking }] = useLazyQuery<CreditCheckResult>(
    CreditCheck,
    {
      fetchPolicy: 'network-only',
      onCompleted: (result: CreditCheckResult) => {
        if (result?.creditCheck) {
          setWorkflowSummary(result.creditCheck);
          setActionSuccess('Credit snapshot refreshed.');
        } else {
          setWorkflowSummary(null);
          setActionSuccess('No sale workflow is available yet.');
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
  type PaymentRow = {
    id: string;
    channel: 'Consumer' | 'Reseller';
    amount: number;
    method: PaymentMethod;
    status: string;
    reference?: string | null;
    receivedAt: string;
    receiptUrl?: string | null;
    receiptKey?: string | null;
    receiptBucket?: string | null;
  };

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

  React.useEffect(() => {
    if (!order) return;
    const normalizedType =
      (order.fulfillmentType as 'PICKUP' | 'DELIVERY' | null) ?? 'PICKUP';
    setFulfillmentTypeDraft(normalizedType);
    setDeliveryAddressDraft(order.deliveryAddress ?? '');
  }, [order?.id, order?.fulfillmentType, order?.deliveryAddress]);
  const quotation = order?.quotation ?? null;
  const normalizedStatus = (quotation?.status || '').toUpperCase();
  const hasOrderUpdatePermission = hasPermission(
    PERMISSIONS.order.UPDATE ?? 'ORDER_UPDATE',
  );
  const hasPaymentApprovalPermission = hasPermission(
    PERMISSIONS.order.APPROVE ?? 'ORDER_APPROVE',
  );
  const isReseller = hasRole('RESELLER');
  const isSuperAdmin = hasRole('SUPERADMIN');
  const canConfirmPayments =
    hasPaymentApprovalPermission &&
    (hasRole('ACCOUNTANT') || hasRole('ADMIN') || isSuperAdmin);
  const canUpdateOrder = hasOrderUpdatePermission;
  const ownsQuotation =
    isReseller && quotation?.resellerId && quotation.resellerId === user?.id;
  const normalizedOrderType = (order?.type || '').toUpperCase();
  const normalizedOrderPhase = (order?.phase || '').toUpperCase();
  const isQuotationPhase = normalizedOrderPhase === 'QUOTATION';
  const canGrantOverrides =
    !isQuotationPhase &&
    hasPermission(PERMISSIONS.order.APPROVE ?? 'ORDER_APPROVE') &&
    (hasRole('MANAGER') || hasRole('ADMIN') || hasRole('SUPERADMIN'));
  const isResellerOwner = Boolean(
    isReseller &&
      normalizedOrderType === 'RESELLER' &&
      user?.id &&
      (order?.resellerSale?.resellerId === user.id ||
        quotation?.resellerId === user.id),
  );

  const initialFulfillmentType =
    (order?.fulfillmentType as 'PICKUP' | 'DELIVERY' | null) ?? 'PICKUP';
  const initialDeliveryAddress = order?.deliveryAddress ?? '';
  const isDelivery = fulfillmentTypeDraft === 'DELIVERY';
  const deliveryAddressError = isDelivery && !deliveryAddressDraft.trim();
  const preferencesDirty =
    fulfillmentTypeDraft !== initialFulfillmentType ||
    (isDelivery &&
      deliveryAddressDraft.trim() !== initialDeliveryAddress.trim());
  const canEditFulfillmentPreferences = hasPermission(
    PERMISSIONS.order.UPDATE ?? 'ORDER_UPDATE',
  );

  const billerUser =
    order?.consumerSale?.biller ??
    order?.resellerSale?.biller ??
    null;
  const billerLabel = formatUserLabel(billerUser) || '—';

  const resellerUser =
    order?.resellerSale?.reseller ?? null;
  const resellerLabel = formatUserLabel(resellerUser);

  const customerInfo =
    order?.consumerSale?.customer ?? null;
  const customerLabel = formatCustomerLabel(customerInfo);

  const isOrderBiller = Boolean(
    user?.id &&
      (
        order?.billerId === user.id ||
        billerUser?.id === user.id ||
        order?.quotation?.billerId === user.id
      ),
  );
  const isDraft = normalizedStatus === 'DRAFT';
  const isSent = normalizedStatus === 'SENT';
  const canConfirm = Boolean(
    ((ownsQuotation && hasOrderUpdatePermission) || isOrderBiller) &&
      (isDraft || isSent),
  );
  const canReject =
    ownsQuotation && hasOrderUpdatePermission && (isDraft || isSent);
  const canEditQuotation =
    ownsQuotation && canUpdateOrder && (isDraft || isSent);

  const canRegisterPayment = Boolean(
    order &&
      !isQuotationPhase &&
      (canUpdateOrder || isSuperAdmin || isOrderBiller || isResellerOwner) &&
      (normalizedOrderType === 'CONSUMER' || normalizedOrderType === 'RESELLER'),
  );

  const primaryStore = order?.consumerSale?.store ?? order?.resellerSale?.store ?? null;
  const storeFallbackLabel =
    (order?.storeId && storeMap.get(order.storeId)) || order?.storeId;
  const storeLabel = formatStoreLabel(primaryStore, storeFallbackLabel);

  const payments = React.useMemo<PaymentRow[]>(() => {
    if (!order) return [];
    const consumerPayments = (order.ConsumerPayment ?? []).map((p) => ({
      id: p.id,
      channel: 'Consumer' as const,
      amount: p.amount,
      method: p.method,
      status: p.status,
      reference: p.reference ?? null,
      receivedAt: p.receivedAt,
      receiptUrl: p.receiptUrl ?? null,
      receiptKey: p.receiptKey ?? null,
      receiptBucket: p.receiptBucket ?? null,
    }));
    const resellerPayments = (order.ResellerPayment ?? []).map((p) => ({
      id: p.id,
      channel: 'Reseller' as const,
      amount: p.amount,
      method: p.method,
      status: p.status,
      reference: p.reference ?? null,
      receivedAt: p.receivedAt,
      receiptUrl: p.receiptUrl ?? null,
      receiptKey: p.receiptKey ?? null,
      receiptBucket: p.receiptBucket ?? null,
    }));
    return [...consumerPayments, ...resellerPayments].sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }, [order]);

  const handleOpenPaymentDialog = React.useCallback(() => {
    if (!order) return;
    setActionError(null);
    setActionSuccess(null);
    const outstanding = workflowSummary?.outstanding ?? 0;
    setPaymentAmount(
      outstanding && Number.isFinite(outstanding) && outstanding > 0
        ? String(outstanding)
        : '',
    );
    setPaymentReference('');
    setPaymentMethod(PaymentMethod.Transfer);
    setReceiptFile(null);
    setReceiptUploadError(null);
    setReceiptUploading(false);
    setShowPaymentDialog(true);
  }, [order, workflowSummary?.outstanding]);

  const handleClosePaymentDialog = React.useCallback(() => {
    setShowPaymentDialog(false);
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
    if (isQuotationPhase) {
      setActionError('Credit snapshot is only available after the quotation is approved.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      await runCreditCheck({ variables: { saleOrderId: order.id } });
    } catch (error: any) {
      setActionError(
        error?.message || 'Failed to refresh credit snapshot.',
      );
    }
  }, [order?.id, runCreditCheck, isQuotationPhase]);

  const handleSaveFulfillmentPreferences = React.useCallback(async () => {
    if (!order) return;
    try {
      await updateFulfillmentPreferencesMutation({
        variables: {
          input: {
            saleOrderId: order.id,
            fulfillmentType: fulfillmentTypeDraft,
            deliveryAddress: isDelivery
              ? deliveryAddressDraft.trim() || null
              : null,
          },
        },
        refetchQueries: [{ query: Order, variables: { id: order.id } }],
      });
      setActionError(null);
      setActionSuccess('Fulfillment preferences updated.');
    } catch (error: any) {
      setActionError(
        error?.message || 'Failed to update fulfillment preferences.',
      );
    }
  }, [
    order,
    fulfillmentTypeDraft,
    deliveryAddressDraft,
    isDelivery,
    updateFulfillmentPreferencesMutation,
  ]);

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

  const handleRegisterPayment = React.useCallback(async () => {
    if (!order?.id) return;
    const amount = parseFloat(paymentAmount || '0');
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Payment amount must be greater than zero.');
      return;
    }
    const referenceRaw = paymentReference.trim();
    const reference = referenceRaw.length ? referenceRaw : undefined;
    setActionError(null);
    setReceiptUploadError(null);
    setActionSuccess(null);
    try {
      let receiptPayload: {
        receiptBucket?: string;
        receiptKey?: string;
        receiptUrl?: string;
      } = {};
      if (receiptFile) {
        try {
          setReceiptUploading(true);
          const apiBase = getApiBase();
          const fd = new FormData();
          fd.append('file', receiptFile);
          const headers: Record<string, string> = {};
          const authToken = token ?? getAuthToken();
          if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
          }
          const response = await fetch(`${apiBase}/payments/receipts`, {
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
              uploaded?.bucket ??
              uploaded?.receiptBucket ??
              undefined,
            receiptKey:
              uploaded?.key ??
              uploaded?.receiptKey ??
              undefined,
            receiptUrl:
              uploaded?.url ??
              uploaded?.receiptUrl ??
              undefined,
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
      if (normalizedOrderType === 'CONSUMER') {
        const consumerSaleId = order.consumerSale?.id;
        if (!consumerSaleId) {
          setActionError('Order is missing consumer sale details.');
          return;
        }
        await registerConsumerPayment({
          variables: {
            input: {
              saleOrderId: order.id,
              consumerSaleId,
              amount,
              method: paymentMethod,
              ...(reference ? { reference } : {}),
              ...receiptPayload,
            },
          },
        });
      } else if (normalizedOrderType === 'RESELLER') {
        const rawResellerId =
          order.resellerSale?.resellerId || quotation?.resellerId || null;
        const resellerId = isResellerOwner
          ? user?.id ?? rawResellerId
          : rawResellerId;
        if (!resellerId) {
          setActionError('Order is missing reseller information.');
          return;
        }
        const receiverId =
          isResellerOwner && order?.billerId
            ? order.billerId
            : user?.id ?? null;
        if (!receiverId) {
          setActionError('Unable to determine who received this payment.');
          return;
        }
        const resellerSaleId =
          order.resellerSale?.id || order.resellerSaleid || undefined;
        await registerResellerPayment({
          variables: {
            input: {
              saleOrderId: order.id,
              resellerId,
              receivedById: receiverId,
              amount,
              method: paymentMethod,
              ...(reference ? { reference } : {}),
              ...(resellerSaleId ? { resellerSaleId } : {}),
              ...receiptPayload,
            },
          },
        });
      } else {
        setActionError('Payments can only be logged for consumer or reseller orders.');
        return;
      }
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentReference('');
      setReceiptFile(null);
      setReceiptUploadError(null);
      setActionSuccess('Payment logged successfully.');
      await Promise.all([
        refetch(),
        runCreditCheck({ variables: { saleOrderId: order.id } }),
      ]);
    } catch (mutationErr: any) {
      setActionError(
        mutationErr?.message ||
          'Failed to log payment. Please try again.',
      );
    }
  }, [
    normalizedOrderType,
    order,
    paymentAmount,
    paymentMethod,
    paymentReference,
    quotation?.resellerId,
    receiptFile,
    token,
    refetch,
    registerConsumerPayment,
    registerResellerPayment,
    runCreditCheck,
    isResellerOwner,
    order?.billerId,
    user?.id,
  ]);

  const handleConfirmPayment = React.useCallback(
    async (payment: PaymentRow) => {
      if (!order?.id) return;
      const normalizedStatus = (payment.status || '').toUpperCase();
      if (normalizedStatus === 'CONFIRMED') return;
      setActionError(null);
      setActionSuccess(null);
      try {
        if (payment.channel === 'Consumer') {
          await confirmConsumerPaymentMutation({
            variables: { input: { paymentId: payment.id } },
          });
        } else {
          await confirmResellerPaymentMutation({
            variables: { paymentId: payment.id },
          });
        }
        setActionSuccess('Payment confirmed successfully.');
        await Promise.all([
          refetch(),
          runCreditCheck({ variables: { saleOrderId: order.id } }),
        ]);
      } catch (confirmErr: any) {
        setActionError(
          confirmErr?.message || 'Failed to confirm payment. Please try again.',
        );
      }
    },
    [
      order?.id,
      confirmConsumerPaymentMutation,
      confirmResellerPaymentMutation,
      refetch,
      runCreditCheck,
    ],
  );

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
              disabled={creditChecking || isQuotationPhase}
            >
              {creditChecking ? 'Refreshing credit...' : 'Refresh Credit Snapshot'}
            </Button>
            {canRegisterPayment && (
              <Button
                variant="contained"
                color="success"
                onClick={handleOpenPaymentDialog}
                disabled={paymentMutationLoading}
              >
                Log Payment
              </Button>
            )}
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
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Fulfillment Preferences
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
                <TextField
                  select
                  label="Fulfillment Type"
                  size="small"
                  value={fulfillmentTypeDraft}
                  onChange={(event) =>
                    setFulfillmentTypeDraft(event.target.value as 'PICKUP' | 'DELIVERY')
                  }
                  sx={{ maxWidth: 220 }}
                  disabled={!canEditFulfillmentPreferences || updatingFulfillmentPreferences}
                >
                  <MenuItem value="PICKUP">Pickup</MenuItem>
                  <MenuItem value="DELIVERY">Delivery</MenuItem>
                </TextField>
                <TextField
                  label="Delivery Address"
                  size="small"
                  value={deliveryAddressDraft}
                  onChange={(event) => setDeliveryAddressDraft(event.target.value)}
                  disabled=
                    {!canEditFulfillmentPreferences || !isDelivery || updatingFulfillmentPreferences}
                  error={deliveryAddressError}
                  helperText={
                    isDelivery
                      ? deliveryAddressError
                        ? 'Delivery address is required for delivery orders.'
                        : 'Shared with the rider and fulfillment team.'
                      : 'Pickup orders do not require a delivery address.'
                  }
                  sx={{ flex: 1 }}
                  multiline
                  minRows={isDelivery ? 2 : 1}
                />
              </Stack>
              {canEditFulfillmentPreferences && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveFulfillmentPreferences}
                    disabled={
                      deliveryAddressError ||
                      !preferencesDirty ||
                      updatingFulfillmentPreferences
                    }
                  >
                    {updatingFulfillmentPreferences ? 'Saving…' : 'Save Preferences'}
                  </Button>
                  <Button
                    size="small"
                    disabled={!preferencesDirty || updatingFulfillmentPreferences}
                    onClick={() => {
                      setFulfillmentTypeDraft(initialFulfillmentType);
                      setDeliveryAddressDraft(initialDeliveryAddress);
                    }}
                  >
                    Reset
                  </Button>
                </Stack>
              )}
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Payments
              </Typography>
              {payments.length > 0 ? (
                <Stack spacing={1.5}>
                  {payments.map((payment) => (
                    <Stack
                      key={payment.id}
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', md: 'center' }}
                      sx={{
                        border: '1px solid rgba(16,94,62,0.12)',
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">
                          {payment.channel} payment
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Received {formatDate(payment.receivedAt)}
                        </Typography>
                      </Stack>
                      <Stack
                        spacing={0.75}
                        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                      >
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                        >
                          <Typography variant="subtitle2">
                            {formatMoney(payment.amount)}
                          </Typography>
                          <Chip label={payment.method} size="small" />
                          {paymentStatusChip(payment.status)}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Ref: {payment.reference || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Receipt:{' '}
                          {payment.receiptUrl ? (
                            <Link
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener"
                              underline="hover"
                            >
                              View receipt
                            </Link>
                          ) : (
                            '—'
                          )}
                        </Typography>
                        {canConfirmPayments &&
                          payment.status?.toUpperCase() !== 'CONFIRMED' && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleConfirmPayment(payment)}
                              disabled={confirmingPayment}
                            >
                              {confirmingPayment ? 'Confirming…' : 'Confirm payment'}
                            </Button>
                          )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No payments recorded for this order yet.
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
                <Typography variant="subtitle2">{storeLabel}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Biller
                </Typography>
                <Typography variant="subtitle2">{billerLabel}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Reseller
                </Typography>
                <Typography variant="subtitle2">{resellerLabel}</Typography>
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
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="subtitle2">{customerLabel}</Typography>
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
            open={showPaymentDialog}
            onClose={handleClosePaymentDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Log Payment</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2}>
                {workflowSummary && (
                  <Typography variant="body2" color="text.secondary">
                    Outstanding balance: {formatMoney(workflowSummary.outstanding ?? 0)}
                  </Typography>
                )}
                <TextField
                  label="Amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  inputProps={{ min: 0, step: '0.01' }}
                  required
                />
                <TextField
                  label="Payment Method"
                  select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                >
                  {paymentMethodOptions.map((method) => (
                    <MenuItem key={method} value={method}>
                      {method.charAt(0) + method.slice(1).toLowerCase()}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Optional internal reference"
                />
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Receipt attachment (optional)
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexWrap="wrap"
                  >
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AttachFileIcon />}
                      disabled={receiptUploading}
                    >
                      {receiptFile ? 'Replace receipt' : 'Attach receipt'}
                      <input
                        type="file"
                        hidden
                        accept="image/*,application/pdf"
                        onChange={handleReceiptSelection}
                      />
                    </Button>
                    {receiptFile && (
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={0.5}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                      >
                        <Typography variant="body2">{receiptFile.name}</Typography>
                        <Button
                          size="small"
                          onClick={() => setReceiptFile(null)}
                          disabled={receiptUploading}
                        >
                          Remove
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                  {receiptUploadError && (
                    <Typography variant="caption" color="error">
                      {receiptUploadError}
                    </Typography>
                  )}
                </Stack>
                {normalizedOrderType === 'RESELLER' && !order.resellerSale?.resellerId && (
                  <Alert severity="warning">
                    Unable to detect the reseller on this order. Please ensure the
                    quotation has an associated reseller before logging a payment.
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePaymentDialog}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleRegisterPayment}
                disabled={paymentMutationLoading}
              >
                {paymentMutationLoading ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogActions>
          </Dialog>
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
