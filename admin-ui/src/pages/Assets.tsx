import React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { notify } from '../shared/notify';
import { useAuth } from '../shared/AuthProvider';
import { PERMISSIONS, permissionList } from '../shared/permissions';
import { uploadAsset } from '../shared/assets';
import {
  AssetKind,
  type AssetsQuery,
  useAssetsQuery,
  useRemoveAssetMutation,
} from '../generated/graphql';
import TableList from '../shared/TableList';
import { ListingHero } from '../shared/ListingLayout';

const DEFAULT_PAGE_SIZE = 200;

function formatBytes(value?: number | null): string {
  if (!value || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function Assets() {
  const { hasPermission } = useAuth();
  const [uploading, setUploading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const { data, loading, error, refetch } = useAssetsQuery({
    variables: { take: DEFAULT_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });
  const [removeAsset] = useRemoveAssetMutation();
  const canUpload = hasPermission(...permissionList(PERMISSIONS.asset.CREATE));
  const canDelete = hasPermission(...permissionList(PERMISSIONS.asset.DELETE));

  const assets = data?.assets ?? [];

  type AssetRow = NonNullable<AssetsQuery['assets']>[number];

  const filteredAssets = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets as AssetRow[];
    return (assets as AssetRow[]).filter((asset) => {
      const haystack = [
        asset.filename,
        asset.key,
        asset.url,
        asset.mimetype,
        asset.kind,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [assets, search]);

  const assetCount = assets.length;
  const filteredCount = filteredAssets.length;

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await uploadAsset({ file, kind: AssetKind.Image });
      notify('Asset uploaded successfully', 'success');
      await refetch();
    } catch (error: any) {
      notify(error?.message || 'Failed to upload asset', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = React.useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify('Asset URL copied', 'success');
    } catch {
      notify('Copy failed', 'error');
    }
  }, []);

  const handleDeleteAsset = React.useCallback(
    async (asset: AssetRow) => {
      try {
        await removeAsset({ variables: { assetId: asset.id } });
        notify('Asset deleted', 'success');
        await refetch();
      } catch (err: any) {
        notify(err?.message || 'Failed to delete asset', 'error');
      }
    },
    [refetch, removeAsset],
  );

  const columns = React.useMemo(
    () => [
      {
        key: 'preview',
        label: 'Preview',
        width: 112,
        render: (asset: AssetRow) =>
          asset.kind === AssetKind.Image ? (
            <Box
              component="img"
              src={asset.url}
              alt={asset.filename ?? asset.id}
              sx={{ width: 88, height: 64, objectFit: 'cover', borderRadius: 1, bgcolor: 'grey.100' }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {asset.mimetype ?? 'No preview'}
            </Typography>
          ),
      },
      {
        key: 'filename',
        label: 'Filename',
        sort: true,
        accessor: (asset: AssetRow) => asset.filename ?? asset.key ?? '',
        render: (asset: AssetRow) => (
          <Stack spacing={0.5}>
            <Typography variant="body2" noWrap>
              {asset.filename || asset.key}
            </Typography>
            <MuiLink href={asset.url} target="_blank" rel="noopener">
              {asset.url.replace(/^https?:\/\//, '')}
            </MuiLink>
          </Stack>
        ),
      },
      {
        key: 'kind',
        label: 'Kind',
        sort: true,
        accessor: (asset: AssetRow) => asset.kind,
      },
      {
        key: 'size',
        label: 'Size',
        sort: true,
        accessor: (asset: AssetRow) => asset.size ?? 0,
        render: (asset: AssetRow) => formatBytes(asset.size),
      },
      {
        key: 'assignments',
        label: 'Assignments',
        render: (asset: AssetRow) => {
          const assignmentCount = asset.assignments?.length ?? 0;
          const primary = asset.assignments?.find((assignment) => assignment.isPrimary);
          return assignmentCount
            ? `${assignmentCount} linked${primary ? ' • primary set' : ''}`
            : '—';
        },
      },
      {
        key: 'createdAt',
        label: 'Created',
        sort: true,
        accessor: (asset: AssetRow) => new Date(asset.createdAt ?? 0).getTime(),
        render: (asset: AssetRow) => formatDate(asset.createdAt),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        width: 160,
        render: (asset: AssetRow) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title="Copy URL">
              <span>
                <IconButton size="small" onClick={() => handleCopyUrl(asset.url)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <IconButton
                size="small"
                component={MuiLink}
                href={asset.url}
                target="_blank"
                rel="noopener"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canDelete && (
              <Tooltip title="Delete asset">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        window.confirm(
                          'Delete this asset from storage? This action cannot be undone.',
                        )
                      ) {
                        await handleDeleteAsset(asset);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [handleCopyUrl, handleDeleteAsset, canDelete],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Assets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage uploaded files such as product imagery, hero banners, and documents.
        </Typography>
      </Stack>

      <ListingHero
        action={
          canUpload ? (
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ borderRadius: 999 }}
            >
              {uploading ? 'Uploading…' : 'Upload Asset'}
              <input hidden type="file" accept="*/*" onChange={handleUpload} />
            </Button>
          ) : undefined
        }
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search by filename, key, or type',
        }}
        density="compact"
      >
        <Typography variant="body2" color="text.secondary">
          {assetCount
            ? search.trim()
              ? `Showing ${filteredCount} of ${assetCount} assets`
              : `${assetCount} asset${assetCount === 1 ? '' : 's'} available`
            : 'No assets uploaded yet'}
        </Typography>
      </ListingHero>

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (tap to retry)
        </Alert>
      )}

      <TableList
        columns={columns}
        rows={filteredAssets}
        loading={loading && !assetCount}
        emptyMessage="No assets uploaded yet."
        getRowKey={(asset: AssetRow) => asset.id}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        rowsPerPageOptions={[10, 25, 50, 100, 200]}
        defaultRowsPerPage={25}
        showFilters={false}
        paginated
      />
    </Stack>
  );
}
