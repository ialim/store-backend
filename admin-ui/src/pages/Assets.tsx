import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { notify } from '../shared/notify';
import { uploadAsset } from '../shared/assets';
import {
  AssetKind,
  useAssetsQuery,
  useRemoveAssetMutation,
} from '../generated/graphql';

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
  const [uploading, setUploading] = React.useState(false);
  const { data, loading, refetch } = useAssetsQuery({
    variables: { take: DEFAULT_PAGE_SIZE },
    fetchPolicy: 'cache-and-network' as any,
  });
  const [removeAsset] = useRemoveAssetMutation();

  const assets = data?.findManyAsset ?? [];

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

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Stack>
              <Typography variant="h5">Assets</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage uploaded files such as product imagery, hero banners, and documents.
              </Typography>
            </Stack>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Asset'}
              <input hidden type="file" accept="*/*" onChange={handleUpload} />
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading && !assets.length ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading assets…</Typography>
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={100}>Preview</TableCell>
                    <TableCell>Filename</TableCell>
                    <TableCell>Kind</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Assignments</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.length ? (
                    assets.map((asset) => {
                      const assignmentCount = asset.assignments?.length ?? 0;
                      const primary = asset.assignments?.find((assignment) => assignment.isPrimary);
                      const preview =
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
                        );

                      const assignmentSummary = assignmentCount
                        ? `${assignmentCount} linked${primary ? ' • primary set' : ''}`
                        : '—';

                      return (
                        <TableRow key={asset.id} hover>
                          <TableCell>{preview}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" noWrap>
                                {asset.filename || asset.key}
                              </Typography>
                              <MuiLink href={asset.url} target="_blank" rel="noopener">
                                {asset.url.replace(/^https?:\/\//, '')}
                              </MuiLink>
                            </Stack>
                          </TableCell>
                          <TableCell>{asset.kind}</TableCell>
                          <TableCell>{formatBytes(asset.size)}</TableCell>
                          <TableCell>{assignmentSummary}</TableCell>
                          <TableCell>{formatDate(asset.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Copy URL">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(asset.url);
                                        notify('Asset URL copied', 'success');
                                      } catch {
                                        notify('Copy failed', 'error');
                                      }
                                    }}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Open in new tab">
                                <IconButton size="small" component={MuiLink} href={asset.url} target="_blank" rel="noopener">
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete asset">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={async () => {
                                      if (!window.confirm('Delete this asset from storage? This action cannot be undone.')) return;
                                      try {
                                        await removeAsset({ variables: { assetId: asset.id } });
                                        notify('Asset deleted', 'success');
                                        await refetch();
                                      } catch (error: any) {
                                        notify(error?.message || 'Failed to delete asset', 'error');
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No assets uploaded yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
