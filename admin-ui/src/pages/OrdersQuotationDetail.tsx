import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
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
import { QuotationDetail } from '../operations/orders';

type QuotationDetailData = {
  quotation: {
    id: string;
    type: string;
    channel: string;
    store: {
      id: string;
      name: string;
      location?: string | null;
    };
    consumer?: {
      id: string;
      fullName: string;
      email?: string | null;
    } | null;
    reseller?: {
      id: string;
      email: string;
    } | null;
    biller?: {
      id: string;
      email: string;
    } | null;
    status: string;
    totalAmount: number;
    saleOrderId?: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
      productVariant?: {
        id: string;
        name?: string | null;
        barcode?: string | null;
        product?: {
          id: string;
          name?: string | null;
        } | null;
      } | null;
    }>;
    SaleOrder?: {
      id: string;
      status: string;
      phase: string;
      totalAmount: number;
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
  if (['APPROVED', 'CONFIRMED'].includes(normalized)) color = 'success';
  else if (['REJECTED', 'CANCELLED'].includes(normalized)) color = 'error';
  else if (['DRAFT', 'PENDING'].includes(normalized)) color = 'warning';
  return <Chip label={status ?? 'Unknown'} color={color} size="small" />;
}

export default function OrdersQuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<QuotationDetailData>(
    QuotationDetail,
    {
      variables: { id: id ?? '' },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    },
  );

  const quotation = data?.quotation;
  const storeLabel = quotation
    ? `${quotation.store.name}${
        quotation.store.location ? ` • ${quotation.store.location}` : ''
      }`
    : '—';
  const storeIdLabel = quotation?.store.id ?? '—';
  const billerLabel = quotation?.biller?.email ?? '—';
  const billerId = quotation?.biller?.id ?? null;
  const partyLabel =
    quotation?.type === 'RESELLER'
      ? quotation?.reseller?.email || '—'
      : quotation?.consumer
      ? `${quotation.consumer.fullName}${
          quotation.consumer.email ? ` (${quotation.consumer.email})` : ''
        }`
      : '—';
  const partyId =
    quotation?.type === 'RESELLER'
      ? quotation?.reseller?.id || '—'
      : quotation?.consumer?.id || '—';

  type QuotationItemRow = NonNullable<QuotationDetailData['quotation']>['items'][number];

  const itemColumns = React.useMemo(
    () => [
      {
        key: 'variant',
        label: 'Product Variant',
        render: (row: QuotationItemRow) => {
          const baseName =
            row.productVariant?.name ||
            row.productVariant?.product?.name ||
            row.productVariant?.barcode ||
            row.productVariantId;
          const details: string[] = [];
          if (
            row.productVariant?.barcode &&
            row.productVariant?.barcode !== baseName
          ) {
            details.push(row.productVariant.barcode);
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
    [],
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
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
        {id && (
          <Button
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={() => navigate(`/orders/quotations/${id}/edit`)}
          >
            Edit Quotation
          </Button>
        )}
      </Stack>

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
