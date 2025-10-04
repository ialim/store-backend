import {
  useCreateProductMutation,
  useProductsQuery,
  useListFacetsQuery,
  useBulkAssignFacetToProductsMutation,
  useBulkRemoveFacetFromProductsMutation,
} from '../generated/graphql';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  InputBase,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import React from 'react';
import TableList from '../shared/TableList';
import { useNavigate } from 'react-router-dom';

export default function Products() {
  const [take, setTake] = React.useState(20);
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const where = React.useMemo(() => {
    const w: Record<string, unknown> = {};
    const sq = q.trim();
    if (sq.length >= 2) {
      w.OR = [
        { name: { contains: sq, mode: 'insensitive' } },
        { barcode: { contains: sq, mode: 'insensitive' } },
      ];
    }
    return Object.keys(w).length ? w : undefined;
  }, [q]);

  const { data, loading, error, refetch } = useProductsQuery({
    variables: { take, where },
    fetchPolicy: 'cache-and-network' as any,
  });
  const list = data?.listProducts ?? [];

  const [createProduct, { loading: creating }] = useCreateProductMutation();
  const { data: facetsData } = useListFacetsQuery({ fetchPolicy: 'cache-first' as any });
  const facets: Array<{ id: string; name: string; code: string; values?: string[] }> = facetsData?.listFacets ?? [];
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);
  const [selFacetId, setSelFacetId] = React.useState('');
  const [selValue, setSelValue] = React.useState('');
  const [bulkAssign, { loading: assigning }] = useBulkAssignFacetToProductsMutation();
  const [bulkRemove, { loading: removing }] = useBulkRemoveFacetFromProductsMutation();

  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : list).map((p: any) => [p.id, p.name || '', p.barcode || '']);
    if (!rows.length) return;
    const header = ['id', 'name', 'barcode'];
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((v: any) => JSON.stringify(v ?? '')).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const canSubmit = Boolean(name);

  const productColumns = React.useMemo(
    () => [
      {
        key: 'sl',
        label: 'SL',
        width: 72,
        render: (_: any, idx: number) => idx + 1,
      },
      {
        key: 'name',
        label: 'Title',
        render: (p: any) => p.name || p.id,
        sort: true,
        accessor: (p: any) => p.name || '',
      },
      {
        key: 'barcode',
        label: 'Barcode',
        render: (p: any) => p.barcode || '—',
        sort: true,
      },
      {
        key: 'id',
        label: 'Product ID',
      },
    ],
    []
  );

  const searchField = (
    <Box
      sx={(t) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: alpha(t.palette.success.main, 0.08),
        borderRadius: 999,
        px: 2,
        py: 1,
      })}
    >
      <SearchIcon sx={{ color: 'success.main', opacity: 0.8 }} />
      <InputBase
        fullWidth
        placeholder="Search name or barcode"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={(t) => ({
          borderRadius: 4,
          p: { xs: 2, md: 3 },
          boxShadow: '0 28px 56px rgba(16, 94, 62, 0.12)',
          background: 'linear-gradient(135deg, rgba(15, 91, 58, 0.08) 0%, rgba(255,255,255,0.98) 100%)',
          border: `1px solid ${alpha(t.palette.success.main, 0.12)}`,
        })}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Products
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor catalogue inventory and keep product records up to date.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
              sx={{ borderRadius: 999 }}
            >
              Add New
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Box sx={{ flexGrow: 1 }}>{searchField}</Box>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Select
                size="small"
                value={take}
                onChange={(event) => setTake(Number(event.target.value) || 20)}
                sx={{ minWidth: 140, borderRadius: 999 }}
              >
                {[10, 20, 50, 100].map((option) => (
                  <MenuItem key={option} value={option}>
                    Show {option}
                  </MenuItem>
                ))}
              </Select>
              <Button variant="outlined" startIcon={<CalendarMonthIcon />} sx={{ borderRadius: 999 }}>
                Date Range
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClick={() => refetch()} sx={{ cursor: 'pointer' }}>
          {error.message} (click to retry)
        </Alert>
      )}

      {selectedIds.length > 0 && (
        <Paper
          elevation={0}
          sx={(t) => ({
            borderRadius: 3,
            p: { xs: 2, md: 3 },
            border: `1px solid ${alpha(t.palette.success.main, 0.12)}`,
            boxShadow: '0 18px 40px rgba(16, 94, 62, 0.12)',
          })}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Selected: {selectedIds.length}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Select
                size="small"
                value={selFacetId}
                onChange={(e) => {
                  setSelFacetId(e.target.value);
                  setSelValue('');
                }}
                displayEmpty
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">
                  <em>Select facet…</em>
                </MenuItem>
                {facets.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </MenuItem>
                ))}
              </Select>
              {(() => {
                const f = facets.find((x) => x.id === selFacetId);
                if (f && Array.isArray(f.values) && f.values.length) {
                  return (
                    <Select
                      size="small"
                      value={selValue}
                      onChange={(e) => setSelValue(e.target.value)}
                      displayEmpty
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="">
                        <em>Value…</em>
                      </MenuItem>
                      {f.values.map((v) => (
                        <MenuItem key={v} value={v}>
                          {v}
                        </MenuItem>
                      ))}
                    </Select>
                  );
                }
                return <TextField size="small" label="Value" value={selValue} onChange={(e) => setSelValue(e.target.value)} />;
              })()}
              <Button
                size="small"
                variant="contained"
                disabled={!selFacetId || !selValue || !selectedIds.length || assigning}
                onClick={async () => {
                  await bulkAssign({ variables: { productIds: selectedIds as string[], facetId: selFacetId, value: selValue } });
                  setSelValue('');
                }}
              >
                Assign to selected
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={!selFacetId || !selValue || !selectedIds.length || removing}
                onClick={async () => {
                  await bulkRemove({ variables: { productIds: selectedIds as string[], facetId: selFacetId, value: selValue } });
                  setSelValue('');
                }}
              >
                Remove from selected
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <TableList
        columns={productColumns as any}
        rows={list}
        loading={loading}
        emptyMessage="No products"
        getRowKey={(p: any) => p.id}
        onRowClick={(p: any) => navigate(`/products/${p.id}`)}
        defaultSortKey="name"
        showFilters={false}
        globalSearch={false}
        enableUrlState
        urlKey="products"
        onExport={exportCsv}
        exportScopeControl
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={(ids) => setSelectedIds(ids)}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Product</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} fullWidth />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={creating || !canSubmit}
            onClick={async () => {
              try {
                const res = await createProduct({
                  variables: {
                    data: {
                      name,
                      barcode: barcode || null,
                      description: description || null,
                    },
                  },
                });
                setOpen(false);
                setName('');
                setBarcode('');
                setDescription('');
                await refetch();
                if (res.data?.createProduct?.id) navigate(`/products/${res.data.createProduct.id}`);
              } catch (e) {
                // noop
              }
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
