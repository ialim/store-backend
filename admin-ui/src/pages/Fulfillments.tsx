import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import {
  FulfillmentStatus,
  FulfillmentsInProgressQuery,
  useDeliverableFulfillmentsQuery,
  useFulfillmentsInProgressQuery,
} from '../generated/graphql';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../shared/AuthProvider';

type FulfillmentRow =
  FulfillmentsInProgressQuery['fulfillmentsInProgress'][number];

function formatStatus(status: FulfillmentStatus | null | undefined) {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function resolveStoreName(row: FulfillmentRow) {
  const consumerStore = row.saleOrder?.consumerSale?.store?.name;
  if (consumerStore) return consumerStore;
  const resellerStore = row.saleOrder?.resellerSale?.store?.name;
  if (resellerStore) return resellerStore;
  return row.saleOrder?.storeId ?? '—';
}

function resolveRiderName(row: FulfillmentRow) {
  const fullName = row.deliveryPersonnel?.customerProfile?.fullName?.trim();
  if (fullName) return fullName;
  return row.deliveryPersonnel?.email ?? '—';
}

function resolveContactEmail(row: FulfillmentRow) {
  const consumerEmail = row.saleOrder?.consumerSale?.customer?.email?.trim();
  if (consumerEmail) return consumerEmail;
  const resellerEmail = row.saleOrder?.resellerSale?.reseller?.email?.trim();
  if (resellerEmail) return resellerEmail;
  const billerEmail = row.saleOrder?.biller?.email?.trim();
  if (billerEmail) return billerEmail;
  return '—';
}

function formatType(type?: string | null) {
  if (!type) return '—';
  return type.replace(/_/g, ' ');
}

export default function Fulfillments() {
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const isRider = hasRole('RIDER');
  const isReseller = hasRole('RESELLER');
  const canManage =
    hasPermission('ORDER_READ') || hasRole('BILLER') || isReseller;

  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useFulfillmentsInProgressQuery({
    variables: {
      statuses: [
        FulfillmentStatus.Pending,
        FulfillmentStatus.Assigned,
        FulfillmentStatus.InTransit,
      ],
      take: 200,
    },
    skip: isRider && !canManage,
    fetchPolicy: 'cache-and-network',
  });

  const fulfillments = data?.fulfillmentsInProgress ?? [];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return fulfillments;
    return fulfillments.filter((row) => {
      const store = resolveStoreName(row).toLowerCase();
      const orderId = row.saleOrderId.toLowerCase();
      const address = row.deliveryAddress?.toLowerCase() ?? '';
      const assigned = resolveRiderName(row).toLowerCase();
      const contactEmail = resolveContactEmail(row).toLowerCase();
      const type = (row.type ?? '').toLowerCase();
      return (
        store.includes(term) ||
        orderId.includes(term) ||
        address.includes(term) ||
        assigned.includes(term) ||
        contactEmail.includes(term) ||
        type.includes(term)
      );
    });
  }, [fulfillments, search]);

  const columns = useMemo(
    () => [
      {
        key: 'contactEmail',
        label: 'Customer / Reseller',
        render: (row: FulfillmentRow) => resolveContactEmail(row),
        sort: true,
        accessor: (row: FulfillmentRow) => resolveContactEmail(row).toLowerCase(),
      },
      {
        key: 'type',
        label: 'Type',
        render: (row: FulfillmentRow) => formatType(row.type),
        sort: true,
        accessor: (row: FulfillmentRow) => row.type ?? '',
      },
      {
        key: 'store',
        label: 'Store',
        render: (row: FulfillmentRow) => resolveStoreName(row),
        sort: true,
        accessor: (row: FulfillmentRow) => resolveStoreName(row).toLowerCase(),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row: FulfillmentRow) => (
          <Chip
            size="small"
            label={formatStatus(row.status)}
            color={row.status === FulfillmentStatus.InTransit ? 'info' : 'default'}
          />
        ),
        sort: true,
        accessor: (row: FulfillmentRow) => row.status ?? '',
      },
      {
        key: 'assignedTo',
        label: 'Assigned To',
        render: (row: FulfillmentRow) => resolveRiderName(row),
      },
      {
        key: 'interestCount',
        label: 'Interested Riders',
        align: 'right' as const,
        render: (row: FulfillmentRow) => row.riderInterests?.length ?? 0,
        sort: true,
        accessor: (row: FulfillmentRow) => row.riderInterests?.length ?? 0,
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (row: FulfillmentRow) =>
          row.createdAt ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true }) : '—',
        sort: true,
        accessor: (row: FulfillmentRow) => new Date(row.createdAt || 0).getTime(),
      },
    ],
    [],
  );

  const { data: deliverableData, loading: loadingDeliverables } =
    useDeliverableFulfillmentsQuery({ skip: !isRider });

  const deliverableFulfillments = deliverableData?.deliverableFulfillments ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Fulfillments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track orders that are currently in the fulfillment phase. Select a row to view and manage its details.
        </Typography>
      </Box>

      {canManage && (
        <ListingHero
          search={{ value: search, onChange: setSearch, placeholder: 'Search email, store, order ID, address, rider' }}
          action={
            <Button
              variant="outlined"
              size="small"
              onClick={() => refetch()}
              disabled={loading}
              sx={{ borderRadius: 999 }}
            >
              Refresh
            </Button>
          }
          density="compact"
        />
      )}

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (click to retry)
        </Alert>
      )}

      {canManage && (
        <TableList
          columns={columns as any}
          rows={filteredRows}
          loading={loading}
          emptyMessage={search ? 'No fulfillments match this search.' : 'No active fulfillments.'}
          onRowClick={(row: FulfillmentRow) => navigate(`/fulfillments/${row.saleOrderId}`)}
          getRowKey={(row: FulfillmentRow) => row.id}
          defaultSortKey="createdAt"
          rowsPerPageOptions={[10, 25, 50]}
          enableUrlState
          urlKey="fulfillments"
        />
      )}

      {isRider && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Delivery opportunities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Volunteer for deliveries in your coverage area.
              </Typography>
            </Box>

            {loadingDeliverables ? (
              <Stack alignItems="center" py={3}>
                <CircularProgress size={24} />
              </Stack>
            ) : deliverableFulfillments.length ? (
              <Stack spacing={1.5}>
                {deliverableFulfillments.map((f) => (
                  <Paper
                    key={f.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                      border: '1px solid rgba(16, 94, 62, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        Sale Order {f.saleOrderId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/fulfillments/${f.saleOrderId}`)}
                    >
                      View details
                    </Button>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No deliveries currently require a rider. Check back soon!
              </Typography>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
