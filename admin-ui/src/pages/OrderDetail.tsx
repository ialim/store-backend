import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatMoney } from '../shared/format';
import { Order } from '../operations/orders';

type OrderData = {
  order: {
    id: string;
    storeId: string;
    billerId: string;
    type: string;
    status: string;
    phase: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    resellerSaleid?: string | null;
    fulfillment?: {
      id: string;
      status: string;
      type: string;
      deliveryPersonnelId?: string | null;
      deliveryAddress?: string | null;
      cost?: number | null;
      createdAt: string;
      updatedAt: string;
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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<OrderData>(Order, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const order = data?.order;

  return (
    <Stack spacing={3}>
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
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(16,94,62,0.12)' }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {order.id}
              </Typography>
              <Stack direction="row" spacing={1}>
                {statusChip(order.status)}
                {statusChip(order.phase)}
              </Stack>
            </Stack>
            <Divider />
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
      )}
    </Stack>
  );
}
