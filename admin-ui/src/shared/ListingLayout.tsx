import React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, InputBase, Paper, Stack, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export type ListingHeroSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
};

export type ListingHeroProps = {
  action?: React.ReactNode;
  search?: ListingHeroSearchProps;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  density?: 'comfortable' | 'compact';
};

export function ListingHero({ action, search, trailing, children, density = 'comfortable' }: ListingHeroProps) {
  const theme = useTheme();
  const compact = density === 'compact';

  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      search?.onChange(event.target.value);
    },
    [search]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && search?.onSubmit) {
        search.onSubmit();
      }
    },
    [search]
  );

  const searchNode = search ? (
    <Box
      sx={{
        flexBasis: { xs: '100%', md: 260 },
        flexGrow: { xs: 1, md: 0 },
        minWidth: { md: 220 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: alpha(theme.palette.success.main, 0.08),
          borderRadius: 999,
          px: compact ? 1.2 : 1.6,
          py: compact ? 0.55 : 0.85,
        }}
      >
        <SearchIcon sx={{ color: theme.palette.success.main, opacity: 0.8 }} />
        <InputBase
          fullWidth
          placeholder={search.placeholder || 'Search'}
          value={search.value}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          sx={{ fontWeight: 500 }}
        />
      </Box>
    </Box>
  ) : null;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        p: compact ? { xs: 1.25, md: 1.75 } : { xs: 1.75, md: 2.5 },
        boxShadow: '0 24px 48px rgba(16, 94, 62, 0.1)',
        background: '#ffffff',
        border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
      }}
    >
      <Stack spacing={compact ? 1.2 : 1.75}>
        {(action || searchNode || trailing) && (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={compact ? 1 : 1.25}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            flexWrap="wrap"
          >
            {searchNode}
            <Stack
              direction="row"
              spacing={compact ? 0.75 : 1}
              alignItems="center"
              flexWrap="wrap"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              sx={{ flex: 1, minWidth: 0, gap: compact ? 0.75 : 1 }}
            >
              {trailing}
              {action}
            </Stack>
          </Stack>
        )}

        {children}
      </Stack>
    </Paper>
  );
}

export type ListingSelectionCardProps = {
  count: number;
  children: React.ReactNode;
  label?: React.ReactNode;
};

export function ListingSelectionCard({ count, children, label }: ListingSelectionCardProps) {
  const theme = useTheme();
  if (!count) return null;
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: { xs: 2, md: 3 },
        border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
        boxShadow: '0 18px 40px rgba(16, 94, 62, 0.12)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label ?? `Selected: ${count}`}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          {children}
        </Stack>
      </Stack>
    </Paper>
  );
}
