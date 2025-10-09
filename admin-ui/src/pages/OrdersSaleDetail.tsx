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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LaunchIcon from '@mui/icons-material/Launch';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';
import { ConsumerSaleDetail, ResellerSaleDetail } from '../operations/orders';

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
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
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
  if (['FULFILLED', 'COMPLETED', 'PAID'].includes(normalized)) color = 'success';
  else if (['CANCELLED', 'REJECTED'].includes(normalized)) color = 'error';
  else if (['PENDING', 'PROCESSING'].includes(normalized)) color = 'warning';
  return <Chip label={status ?? 'Unknown'} color={color} size="small" />;
}

export default function OrdersSaleDetail() {
  const params = useParams<{ kind: string; id: string }>();
  const navigate = useNavigate();
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

  const loading = consumerResult.loading || resellerResult.loading;
  const error = consumerResult.error || resellerResult.error;

  const consumerSale = consumerResult.data?.consumerSale;
  const resellerSale = resellerResult.data?.resellerSale;
  const sale = isConsumer ? consumerSale : resellerSale;

  const saleOrderId = isConsumer
    ? consumerSale?.saleOrderId
    : resellerSale?.SaleOrderid;
  const partyId = isConsumer
    ? consumerSale?.customerId
    : resellerSale?.resellerId;
  const channel = isConsumer ? consumerSale?.channel : 'RESELLER';

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

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
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
      </Stack>

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
                <Typography variant="subtitle2">{sale.storeId}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Biller
                </Typography>
                <Typography variant="subtitle2">{sale.billerId}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Customer / Reseller
                </Typography>
                <Typography variant="subtitle2">{partyId || '—'}</Typography>
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
    </Stack>
  );
}
