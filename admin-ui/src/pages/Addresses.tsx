import React from 'react';
import {
  useAddressesNeedingReviewQuery,
  useVerifyAddressMutation,
} from '../generated/graphql';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TableList from '../shared/TableList';
import { notify } from '../shared/notify';

export default function Addresses() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useAddressesNeedingReviewQuery({ variables: { limit: 200 } });
  const addresses = data?.addressesNeedingReview ?? [];

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formattedAddress, setFormattedAddress] = React.useState('');
  const [latitude, setLatitude] = React.useState<string>('');
  const [longitude, setLongitude] = React.useState<string>('');
  const [confidence, setConfidence] = React.useState<string>('');
  const [verifyAddress, { loading: verifying }] = useVerifyAddressMutation();
  const [formError, setFormError] = React.useState<string | null>(null);

  const openDialog = (address: (typeof addresses)[number]) => {
    setSelectedId(address.id);
    setFormattedAddress(address.formattedAddress ?? '');
    setLatitude(address.latitude != null ? String(address.latitude) : '');
    setLongitude(address.longitude != null ? String(address.longitude) : '');
    setConfidence(address.confidence != null ? String(address.confidence) : '');
    setFormError(null);
  };

  const closeDialog = () => {
    setSelectedId(null);
    setFormError(null);
  };

  const selected = selectedId
    ? addresses.find((address) => address.id === selectedId) ?? null
    : null;

  const handleVerify = async () => {
    if (!selectedId) return;
    const parseNumeric = (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return undefined;
      const num = Number.parseFloat(trimmed);
      if (Number.isNaN(num)) {
        throw new Error('Numeric fields must contain valid numbers.');
      }
      return num;
    };

    try {
      await verifyAddress({
        variables: {
          addressId: selectedId,
          patch: {
            formattedAddress: formattedAddress.trim() || undefined,
            latitude: parseNumeric(latitude ?? ''),
            longitude: parseNumeric(longitude ?? ''),
            confidence: parseNumeric(confidence ?? ''),
          },
        },
      });
      notify('Address marked as verified', 'success');
      closeDialog();
      await refetch();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to verify address');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Address Review
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review unverified or manually entered addresses before approving deliveries.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={() => refetch()} sx={{ borderRadius: 999 }}>
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (click to retry)
        </Alert>
      )}

      <TableList
        rows={addresses}
        loading={loading}
        emptyMessage="All addresses have been reviewed"
        getRowKey={(address: any) => address.id}
        columns={[
          {
            key: 'formattedAddress',
            label: 'Address',
            render: (address: any) => (
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {address.formattedAddress || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Provider: {address.provider} · Created {new Date(address.createdAt).toLocaleString()}
                </Typography>
              </Stack>
            ),
            filter: true,
            accessor: (address: any) => address.formattedAddress || '',
          },
          {
            key: 'coordinates',
            label: 'Coordinates',
            render: (address: any) => (
              <Typography variant="body2">
                {address.latitude != null && address.longitude != null
                  ? `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`
                  : '—'}
              </Typography>
            ),
          },
          {
            key: 'confidence',
            label: 'Confidence',
            render: (address: any) => (
              <Typography variant="body2">
                {address.confidence != null ? address.confidence.toFixed(2) : '—'}
              </Typography>
            ),
          },
          {
            key: 'assignments',
            label: 'Assignments',
            render: (address: any) => (
              <Stack spacing={0.5}>
                {address.assignments?.length ? (
                  address.assignments.map((assignment: any) => (
                    <Typography key={assignment.id} variant="caption" color="text.secondary">
                      {assignment.ownerType} · {assignment.ownerId}
                      {assignment.label ? ` (${assignment.label})` : ''}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No active assignments
                  </Typography>
                )}
              </Stack>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (address: any) => (
              <Button
                size="small"
                variant="contained"
                onClick={() => openDialog(address)}
              >
                Verify
              </Button>
            ),
          },
        ] as any}
        showFilters
        enableUrlState
        urlKey="address-review"
      />

      <Dialog open={Boolean(selected)} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Verify Address</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Formatted Address"
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  label="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  type="number"
                  fullWidth
                />
                <TextField
                  label="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  type="number"
                  fullWidth
                />
              </Stack>
              <TextField
                label="Confidence"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                type="number"
                fullWidth
              />
              {formError && (
                <Alert severity="error" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            onClick={handleVerify}
            variant="contained"
            disabled={verifying}
          >
            {verifying ? 'Verifying…' : 'Mark Verified'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
