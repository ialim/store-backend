import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';
import {
  ListRidersQuery,
  useListRidersQuery,
  useRiderCoverageAreasQuery,
  useStoresQuery,
  useUpsertRiderCoverageMutation,
} from '../generated/graphql';

type RiderRow = NonNullable<ListRidersQuery['listUsers']>[number];

const PAGE_SIZE = 200;

function displayRiderName(rider: RiderRow) {
  const fullName = rider.customerProfile?.fullName?.trim();
  if (fullName) return fullName;
  return rider.email ?? 'Unnamed rider';
}

export default function Riders() {
  const [query, setQuery] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [radiusInput, setRadiusInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverageCounts, setCoverageCounts] = useState<Record<string, number>>({});

  const {
    data: ridersData,
    loading: loadingRiders,
    error: ridersError,
    refetch: refetchRiders,
  } = useListRidersQuery({
    variables: { take: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });

  const riders = ridersData?.listUsers ?? [];

  useEffect(() => {
    if (!selectedRiderId && riders.length) {
      setSelectedRiderId(riders[0].id);
    }
  }, [riders, selectedRiderId]);

  const filteredRiders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return riders;
    return riders.filter((rider) => {
      const name = displayRiderName(rider).toLowerCase();
      const email = rider.email?.toLowerCase() ?? '';
      return name.includes(term) || email.includes(term);
    });
  }, [query, riders]);

  useEffect(() => {
    if (!selectedRiderId && filteredRiders.length) {
      setSelectedRiderId(filteredRiders[0].id);
    }
  }, [filteredRiders, selectedRiderId]);

  const selectedRider = filteredRiders.find((r) => r.id === selectedRiderId) ?? null;

  const {
    data: coverageData,
    loading: loadingCoverage,
    refetch: refetchCoverage,
  } = useRiderCoverageAreasQuery({
    variables: { riderId: selectedRiderId ?? '' },
    skip: !selectedRiderId,
    fetchPolicy: 'cache-and-network',
  });

  const coverageRows = coverageData?.riderCoverageAreas ?? [];

  useEffect(() => {
    if (selectedRiderId) {
      setCoverageCounts((prev) => ({
        ...prev,
        [selectedRiderId]: coverageRows.length,
      }));
    }
  }, [coverageRows.length, selectedRiderId]);

  const { data: storesData } = useStoresQuery({
    variables: { take: 100 },
    fetchPolicy: 'cache-first',
  });
  const storeOptions = storesData?.listStores ?? [];

  const [upsertCoverage, { loading: savingCoverage }] =
    useUpsertRiderCoverageMutation();

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchRiders(), refetchCoverage()]);
  }, [refetchRiders, refetchCoverage]);

  const commitCoverage = useCallback(
    async (rows: Array<{ storeId: string; serviceRadiusKm?: number | null }>) => {
      if (!selectedRiderId) return;
      setMessage(null);
      setError(null);
      try {
        await upsertCoverage({
          variables: {
            input: {
              riderId: selectedRiderId,
              coverage: rows.map((row) => ({
                storeId: row.storeId,
                serviceRadiusKm:
                  row.serviceRadiusKm != null ? row.serviceRadiusKm : null,
              })),
            },
          },
        });
        setCoverageCounts((prev) => ({ ...prev, [selectedRiderId]: rows.length }));
        await refetchCoverage();
        setMessage('Saved rider coverage.');
      } catch (err: any) {
        setError(err?.message ?? 'Failed to update coverage.');
      }
    },
    [refetchCoverage, selectedRiderId, upsertCoverage],
  );

  const handleAddCoverage = useCallback(async () => {
    if (!selectedRiderId) {
      setError('Select a rider first.');
      return;
    }
    if (!selectedStoreId) {
      setError('Select a store to add.');
      return;
    }
    const existing = coverageRows.find((row) => row.storeId === selectedStoreId);
    if (existing) {
      setError('This rider already covers the selected store.');
      return;
    }
    let parsedRadius: number | undefined;
    if (radiusInput.trim()) {
      const parsed = Number.parseFloat(radiusInput.trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Service radius must be a positive number.');
        return;
      }
      parsedRadius = parsed;
    }
    await commitCoverage([
      ...coverageRows.map((row) => ({
        storeId: row.storeId,
        serviceRadiusKm: row.serviceRadiusKm ?? undefined,
      })),
      { storeId: selectedStoreId, serviceRadiusKm: parsedRadius ?? undefined },
    ]);
    setSelectedStoreId('');
    setRadiusInput('');
  }, [commitCoverage, coverageRows, radiusInput, selectedRiderId, selectedStoreId]);

  const handleRemoveCoverage = useCallback(
    async (storeId: string) => {
      const next = coverageRows.filter((row) => row.storeId !== storeId);
      await commitCoverage(
        next.map((row) => ({
          storeId: row.storeId,
          serviceRadiusKm: row.serviceRadiusKm ?? undefined,
        })),
      );
    },
    [commitCoverage, coverageRows],
  );

  const columns = useMemo(() => {
    return [
      {
        key: 'name',
        label: 'Name',
        render: (row: RiderRow) => displayRiderName(row),
        sort: true,
        accessor: (row: RiderRow) => displayRiderName(row).toLowerCase(),
      },
      {
        key: 'email',
        label: 'Email',
        render: (row: RiderRow) => row.email ?? '—',
        sort: true,
        accessor: (row: RiderRow) => row.email ?? '',
      },
      {
        key: 'createdAt',
        label: 'Joined',
        render: (row: RiderRow) =>
          row.createdAt ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true }) : '—',
        sort: true,
        accessor: (row: RiderRow) => new Date(row.createdAt || 0).getTime(),
      },
      {
        key: 'coverageCount',
        label: 'Coverage Count',
        align: 'right',
        render: (row: RiderRow) => coverageCounts[row.id] ?? '—',
        sort: true,
        accessor: (row: RiderRow) => coverageCounts[row.id] ?? 0,
      },
    ];
  }, [coverageCounts]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Riders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage rider accounts and the stores they can fulfil deliveries for.
        </Typography>
      </Box>

      <ListingHero
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search by name or email',
        }}
        action={(
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefresh}
            disabled={loadingRiders}
            sx={{ borderRadius: 999 }}
          >
            Refresh
          </Button>
        )}
        density="compact"
      />

      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {ridersError && (
        <Alert severity="error" onClick={() => refetchRiders()} sx={{ cursor: 'pointer' }}>
          {ridersError.message} (click to retry)
        </Alert>
      )}

      <TableList
        rows={filteredRiders}
        columns={columns as any}
        loading={loadingRiders}
        emptyMessage={query ? 'No riders match this search.' : 'No riders found.'}
        onRowClick={(row: RiderRow) => setSelectedRiderId(row.id)}
        getRowKey={(row: RiderRow) => row.id}
        defaultSortKey="createdAt"
        rowsPerPageOptions={[10, 25, 50]}
        enableUrlState
        urlKey="riders"
        rowAccent={(row: RiderRow) => (row.id === selectedRiderId ? 'success' : 'default')}
      />

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Coverage assignments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedRider
                ? `Managing coverage for ${displayRiderName(selectedRider)}.`
                : 'Select a rider to view and edit coverage.'}
            </Typography>
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'flex-end' }}
          >
            <Autocomplete
              sx={{ minWidth: 240 }}
              value={
                selectedStoreId
                  ? storeOptions.find((option: any) => option.id === selectedStoreId) ?? null
                  : null
              }
              onChange={(_, value) => setSelectedStoreId(value?.id ?? '')}
              options={storeOptions}
              getOptionLabel={(option: any) => option.name ?? option.id}
              renderInput={(params) => (
                <TextField {...params} label="Store" size="small" />
              )}
              disabled={!selectedRiderId}
            />
            <TextField
              label="Service radius (km)"
              size="small"
              value={radiusInput}
              onChange={(event) => setRadiusInput(event.target.value)}
              sx={{ maxWidth: 180 }}
              disabled={!selectedRiderId}
              type="number"
              inputProps={{ min: 0, step: 0.5 }}
            />
            <Button
              variant="contained"
              onClick={handleAddCoverage}
              disabled={!selectedRiderId || !selectedStoreId || savingCoverage}
            >
              Add coverage
            </Button>
          </Stack>

          {loadingCoverage ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={24} />
            </Stack>
          ) : coverageRows.length ? (
            <Stack spacing={1.25}>
              {coverageRows.map((row) => (
                <Paper
                  key={row.id}
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
                      {row.store?.name ?? row.storeId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Assigned{' '}
                      {row.createdAt
                        ? formatDistanceToNow(new Date(row.createdAt), {
                            addSuffix: true,
                          })
                        : '—'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Radius:{' '}
                      {row.serviceRadiusKm != null
                        ? `${row.serviceRadiusKm} km`
                        : '—'}
                    </Typography>
                    <Button
                      color="error"
                      size="small"
                      onClick={() => handleRemoveCoverage(row.storeId)}
                      disabled={savingCoverage}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {selectedRider
                ? 'No coverage entries yet. Add at least one store to start routing fulfilments.'
                : 'Coverage details will appear once a rider is selected.'}
            </Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
