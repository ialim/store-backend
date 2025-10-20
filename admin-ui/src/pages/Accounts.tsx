import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useMyResellerProfileQuery } from '../generated/graphql';
import { formatMoney } from '../shared/format';

function profileStatusColor(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function Accounts() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch,
  } = useMyResellerProfileQuery({ fetchPolicy: 'cache-and-network' as any });
  const profile = data?.myResellerProfile;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Accounts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Keep track of your credit usage, payments, and account tier.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card sx={{ borderRadius: 4, boxShadow: '0 26px 48px rgba(16, 94, 62, 0.08)' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {loading ? (
            <Stack spacing={2}>
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="rectangular" height={120} />
            </Stack>
          ) : profile ? (
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {profile.companyName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activated {formatDate(profile.activatedAt)} • Tier {profile.tier}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`Status: ${profile.profileStatus}`}
                    color={profileStatusColor(profile.profileStatus) as any}
                    size="small"
                  />
                  <Button size="small" variant="outlined" onClick={() => refetch()}>
                    Refresh
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                {[
                  {
                    label: 'Outstanding Balance',
                    value: formatMoney(profile.outstandingBalance ?? 0),
                    helper: 'Payments remaining on your account.',
                  },
                  {
                    label: 'Credit Limit',
                    value: formatMoney(profile.creditLimit ?? 0),
                    helper: 'Maximum credit available for orders.',
                  },
                  {
                    label: 'Assigned Store Admin',
                    value: profile.biller?.email || '—',
                    helper: 'Reach out to coordinate payments or clarifications.',
                  },
                ].map((item) => (
                  <Grid item xs={12} md={4} key={item.label}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                      variant="outlined"
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                          {item.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {item.helper}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Payment Activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Payment receipts and transaction details are available on each sale record. Visit your sales page to register offline payments or download receipts.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => navigate('/orders/sales')}
                  >
                    Go to Sales
                  </Button>
                  <Button variant="outlined" onClick={() => navigate('/orders')}>
                    View Orders
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              We could not locate your reseller profile. Please contact support if this persists.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

