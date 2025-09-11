import { gql, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, CircularProgress } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';
import TableList from '../shared/TableList';
import { formatMoney } from '../shared/format';

const GET = gql`
  query Product($id: String!) {
    findUniqueProduct(where: { id: $id }) {
      id
      name
      description
      barcode
      createdAt
      categoryId
      variants { id size concentration packaging barcode price resellerPrice createdAt stockItems { quantity reserved store { id name } } }
    }
  }
`;

const CREATE_VARIANT = gql`
  mutation CreateVariant($data: ProductVariantCreateInput!) {
    createProductVariant(data: $data) { id }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: String!, $data: ProductUpdateInput!) {
    updateProduct(where: { id: $id }, data: $data) { id }
  }
`;

const UPDATE_VARIANT = gql`
  mutation UpdateVariant($id: String!, $data: ProductVariantUpdateInput!) {
    updateProductVariant(where: { id: $id }, data: $data) { id }
  }
`;

const DELETE_VARIANT = gql`
  mutation DeleteVariant($id: String!) { deleteProductVariant(where: { id: $id }) { id } }
`;

const CATEGORIES = gql`
  query ProductCategories { listProductCategorys(take: 200) { id name } }
`;

const VARIANTS = gql`
  query VariantsByProduct($id: String!) {
    listProductVariants(where: { productId: { equals: $id } }) {
      id
      size
      concentration
      packaging
      barcode
      price
      resellerPrice
      createdAt
      stockItems { quantity reserved store { id name } }
    }
  }
`;

const STOCK_TOTALS = gql`
  query StockTotalsByProduct($productId: String!) {
    stockTotalsByProduct(productId: $productId) {
      variantId
      onHand
      reserved
      available
    }
  }
`;

const STOCK_BY_VARIANT = gql`
  query StockByVariant($productVariantId: ID!) {
    stock(input: { productVariantId: $productVariantId }) {
      quantity
      reserved
      store { id name }
    }
  }
`;

const STORES = gql`
  query ListStoresForInventory { listStores(take: 200) { id name } }
`;
const STOCK_TOTALS_BY_STORE = gql`
  query StockTotalsByProductStore($productId: String!, $storeId: String!) {
    stockTotalsByProductStore(productId: $productId, storeId: $storeId) {
      variantId
      onHand
      reserved
      available
    }
  }
`;

export default function ProductDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useQuery(GET, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const [createVariant, { loading: creating }] = useMutation(CREATE_VARIANT);
  const p = data?.findUniqueProduct;
  const { data: catData } = useQuery(CATEGORIES, { fetchPolicy: 'cache-first' });
  const categories = catData?.listProductCategorys ?? [];
  const { data: vData, loading: vLoading, error: vError, refetch: refetchVariants } = useQuery(VARIANTS, { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' });
  const [storeTotalsFilter, setStoreTotalsFilter] = React.useState<string>('');
  const { data: storesData } = useQuery(STORES, { fetchPolicy: 'cache-first' });
  const storeList = storesData?.listStores ?? [];
  const { data: totalsDataAll, loading: loadingTotalsAll } = useQuery(STOCK_TOTALS, { variables: { productId: id! }, skip: !id || !!storeTotalsFilter, fetchPolicy: 'network-only' });
  const { data: totalsDataStore, loading: loadingTotalsStore } = useQuery(STOCK_TOTALS_BY_STORE, { variables: { productId: id!, storeId: storeTotalsFilter }, skip: !id || !storeTotalsFilter, fetchPolicy: 'network-only' });
  const [updateProduct] = useMutation(UPDATE_PRODUCT);
  const [updateVariant] = useMutation(UPDATE_VARIANT);
  const [deleteVariant] = useMutation(DELETE_VARIANT);

  const [size, setSize] = React.useState('');
  const [concentration, setConcentration] = React.useState('');
  const [packaging, setPackaging] = React.useState('');
  const [vBarcode, setVBarcode] = React.useState('');
  const [price, setPrice] = React.useState<number>(0);
  const [resellerPrice, setResellerPrice] = React.useState<number>(0);
  const canAdd = !!size && !!concentration && !!packaging && price > 0 && resellerPrice > 0;
  const [editVariant, setEditVariant] = React.useState<Variant | null>(null);
  const [invVariant, setInvVariant] = React.useState<any | null>(null);

  if ((loading || vLoading) && !p) return <Skeleton variant="rectangular" height={200} />;
  if (error || vError) return <Alert severity="error">{error?.message || vError?.message}</Alert>;
  if (!p) return <Alert severity="info">Product not found.</Alert>;

  const variants = vData?.listProductVariants ?? p.variants ?? [];
  const [showVariantFilters, setShowVariantFilters] = React.useState(false);

  const totalsMap = React.useMemo(() => {
    const map = new Map<string, { onHand: number; reserved: number; available: number }>();
    const list = storeTotalsFilter ? (totalsDataStore?.stockTotalsByProductStore || []) : (totalsDataAll?.stockTotalsByProduct || []);
    list.forEach((t: any) => map.set(t.variantId, t));
    return map;
  }, [totalsDataAll, totalsDataStore, storeTotalsFilter]);
  const totalsLoading = storeTotalsFilter ? loadingTotalsStore : loadingTotalsAll;

  const exportCsv = ({ sorted }: { sorted: any[] }) => {
    const rows = (sorted?.length ? sorted : variants).map((v: any) => {
      const t = totalsMap.get(v.id);
      const onHand = t?.onHand ?? (v.stockItems || []).reduce((a: number, s: any) => a + (s?.quantity || 0), 0);
      const reserved = t?.reserved ?? (v.stockItems || []).reduce((a: number, s: any) => a + (s?.reserved || 0), 0);
      const available = t?.available ?? (onHand - reserved);
      return [v.id, v.size, v.concentration, v.packaging, v.barcode || '', v.price, v.resellerPrice, onHand, reserved, available, v.createdAt];
    });
    if (!rows.length) return;
    const header = ['id','size','concentration','packaging','barcode','price','resellerPrice','onHand','reserved','available','createdAt'];
    const csv = [header, ...rows].map((r) => r.map((x) => JSON.stringify(x ?? '')).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `product-${p.id}-variants.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{p.name}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle1">Summary</Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography color="text.secondary">Product ID: {p.id}</Typography>
              <Typography color="text.secondary">Created: {new Date(p.createdAt).toLocaleString()}</Typography>
              <TextField label="Name" size="small" defaultValue={p.name} onBlur={async (e) => { const v = e.target.value.trim(); if (v && v !== p.name) { await updateProduct({ variables: { id, data: { name: { set: v } } } }); refetch(); } }} />
              <TextField label="Barcode" size="small" defaultValue={p.barcode || ''} onBlur={async (e) => { const v = e.target.value.trim(); await updateProduct({ variables: { id, data: { barcode: { set: v || null } } } }); refetch(); }} />
              <TextField label="Description" size="small" defaultValue={p.description || ''} onBlur={async (e) => { const v = e.target.value; await updateProduct({ variables: { id, data: { description: { set: v || null } } } }); refetch(); }} multiline minRows={2} />
              <Typography color="text.secondary">Category: {categories.find((c: any) => c.id === p.categoryId)?.name || p.categoryId}</Typography>
              <Select size="small" defaultValue={p.categoryId || ''} onChange={async (e) => { const catId = e.target.value as string; await updateProduct({ variables: { id, data: { category: { connect: { id: catId } } } } }); refetch(); }} displayEmpty>
                <MenuItem value=""><em>Select category…</em></MenuItem>
                {categories.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </Stack>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle1">Add Variant</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <TextField label="Size" size="small" value={size} onChange={(e) => setSize(e.target.value)} />
              <TextField label="Concentration" size="small" value={concentration} onChange={(e) => setConcentration(e.target.value)} />
              <TextField label="Packaging" size="small" value={packaging} onChange={(e) => setPackaging(e.target.value)} />
              <TextField label="Barcode (optional)" size="small" value={vBarcode} onChange={(e) => setVBarcode(e.target.value)} />
              <Stack direction="row" spacing={1}>
                <TextField label="Price" type="number" size="small" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
                <TextField label="Reseller Price" type="number" size="small" value={resellerPrice} onChange={(e) => setResellerPrice(Number(e.target.value) || 0)} />
              </Stack>
              <Box>
                <Button variant="contained" disabled={creating || !canAdd} onClick={async () => {
                  try {
                    await createVariant({ variables: { data: {
                      size, concentration, packaging, barcode: vBarcode || null,
                      price, resellerPrice,
                      product: { connect: { id } },
                    } } });
                    setSize(''); setConcentration(''); setPackaging(''); setVBarcode(''); setPrice(0); setResellerPrice(0);
                    await refetch();
                  } catch {}
                }}>{creating ? 'Adding…' : 'Add Variant'}</Button>
              </Box>
            </Stack>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card><CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">Variants</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Select size="small" value={storeTotalsFilter} onChange={(e) => setStoreTotalsFilter(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
              <MenuItem value=""><em>All stores (totals)</em></MenuItem>
              {storeList.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
            {totalsLoading && <CircularProgress size={18} />}
            <Button size="small" onClick={() => setShowVariantFilters((s) => !s)}>
              {showVariantFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Stack>
        </Stack>
        <TableList
          columns={[
            { key: 'size', label: 'Size', sort: true, filter: true },
            { key: 'concentration', label: 'Concentration', sort: true, filter: true },
            { key: 'packaging', label: 'Packaging', sort: true, filter: true },
            { key: 'barcode', label: 'Barcode', render: (v: any) => v.barcode || '—', sort: true, filter: true },
            { key: 'price', label: 'Price', render: (v: any) => formatMoney(v.price), sort: true, accessor: (v: any) => v.price || 0 },
            { key: 'resellerPrice', label: 'Reseller Price', render: (v: any) => formatMoney(v.resellerPrice), sort: true, accessor: (v: any) => v.resellerPrice || 0 },
            { key: 'onHand', label: 'On Hand', render: (v: any) => totalsMap.get(v.id)?.onHand ?? '—', sort: true, accessor: (v: any) => totalsMap.get(v.id)?.onHand ?? 0 },
            { key: 'reserved', label: 'Reserved', render: (v: any) => totalsMap.get(v.id)?.reserved ?? '—', sort: true, accessor: (v: any) => totalsMap.get(v.id)?.reserved ?? 0 },
            { key: 'available', label: 'Available', render: (v: any) => totalsMap.get(v.id)?.available ?? '—', sort: true, accessor: (v: any) => totalsMap.get(v.id)?.available ?? 0 },
            { key: 'createdAt', label: 'Created', render: (v: any) => new Date(v.createdAt).toLocaleString(), sort: true, accessor: (v: any) => new Date(v.createdAt || 0) },
            { key: 'actions', label: 'Actions', render: (v: any) => (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setEditVariant(v)}>Edit</Button>
                <Button size="small" color="error" onClick={async () => { if (!window.confirm('Delete this variant?')) return; await deleteVariant({ variables: { id: v.id } }); await refetch(); }}>Delete</Button>
                <Button size="small" variant="outlined" onClick={() => setInvVariant(v)}>Inventory</Button>
              </Stack>
            ) },
          ] as any}
          rows={variants}
          loading={loading}
          emptyMessage="No variants"
          getRowKey={(v: any) => v.id}
          defaultSortKey="createdAt"
          
          showFilters={showVariantFilters}
          enableUrlState
          urlKey={`product_variants_${p.id}`}
          onExport={totalsLoading ? undefined : exportCsv}
          exportScopeControl
        />
      </CardContent></Card>

      <VariantDialog
        variant={editVariant}
        onClose={() => setEditVariant(null)}
        onSave={async (vars) => { await updateVariant({ variables: { id: editVariant!.id, data: vars } }); setEditVariant(null); await Promise.all([refetch(), refetchVariants()]); }}
      />
      <InventoryDialog variant={invVariant} onClose={() => setInvVariant(null)} />
    </Stack>
  );
}

type Variant = { id: string; size: string; concentration: string; packaging: string; barcode?: string | null; price: number; resellerPrice: number };

function VariantDialog({ variant, onClose, onSave }: { variant: Variant | null; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [size, setSize] = React.useState('');
  const [concentration, setConcentration] = React.useState('');
  const [packaging, setPackaging] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [price, setPrice] = React.useState<number>(0);
  const [resellerPrice, setResellerPrice] = React.useState<number>(0);
  React.useEffect(() => {
    if (!variant) return;
    setSize(variant.size || '');
    setConcentration(variant.concentration || '');
    setPackaging(variant.packaging || '');
    setBarcode(variant.barcode || '');
    setPrice(variant.price || 0);
    setResellerPrice(variant.resellerPrice || 0);
  }, [variant]);
  const open = !!variant;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Variant</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField label="Size" size="small" value={size} onChange={(e) => setSize(e.target.value)} />
          <TextField label="Concentration" size="small" value={concentration} onChange={(e) => setConcentration(e.target.value)} />
          <TextField label="Packaging" size="small" value={packaging} onChange={(e) => setPackaging(e.target.value)} />
          <TextField label="Barcode" size="small" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          <Stack direction="row" spacing={1}>
            <TextField label="Price" type="number" size="small" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            <TextField label="Reseller Price" type="number" size="small" value={resellerPrice} onChange={(e) => setResellerPrice(Number(e.target.value) || 0)} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={async () => {
          await onSave({
            size: { set: size },
            concentration: { set: concentration },
            packaging: { set: packaging },
            barcode: { set: barcode || null },
            price: { set: price },
            resellerPrice: { set: resellerPrice },
          });
        }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function InventoryDialog({ variant, onClose }: { variant: any | null; onClose: () => void }) {
  const open = !!variant;
  const { data, loading, error } = useQuery(STOCK_BY_VARIANT, {
    variables: { productVariantId: variant?.id as string },
    skip: !variant?.id,
    fetchPolicy: 'network-only',
  });
  const items: Array<{ quantity: number; reserved: number; store?: { id: string; name: string } }>
    = (data?.stock || []);
  const stores = React.useMemo(() => {
    const list = Array.from(new Map(items.map(s => [s.store?.id, s.store])).values()).filter(Boolean) as Array<{ id: string; name: string }>;
    return list;
  }, [items]);
  const [storeId, setStoreId] = React.useState<string>('');
  const filtered = React.useMemo(() => {
    if (!storeId) return items;
    return items.filter((s) => (s.store?.id || '') === storeId);
  }, [items, storeId]);
  const onHand = filtered.reduce((a, s) => a + (s?.quantity || 0), 0);
  const reserved = filtered.reduce((a, s) => a + (s?.reserved || 0), 0);
  const available = onHand - reserved;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Inventory by Store</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Select size="small" value={storeId} onChange={(e) => setStoreId(e.target.value)} displayEmpty disabled={loading} sx={{ minWidth: 220 }}>
              <MenuItem value=""><em>All stores…</em></MenuItem>
              {stores.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>
              ))}
            </Select>
            {loading && <CircularProgress size={18} />}
          </Stack>
          {loading && <Typography color="text.secondary">Loading stock…</Typography>}
          {error && <Typography color="error">{String(error.message || error)}</Typography>}
          {!loading && filtered.length === 0 && (
            <Typography color="text.secondary">No stock records for this variant.</Typography>
          )}
          {filtered.map((s, idx) => (
            <Stack key={`${s.store?.id || idx}`} direction="row" justifyContent="space-between">
              <Typography>{s.store?.name || s.store?.id || 'Store'}</Typography>
              <Typography>On hand: {s.quantity} • Reserved: {s.reserved} • Available: {Math.max(0, (s.quantity || 0) - (s.reserved || 0))}</Typography>
            </Stack>
          ))}
          {filtered.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2">Totals</Typography>
              <Typography>On hand: {onHand} • Reserved: {reserved} • Available: {available}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// (single InventoryDialog defined above)
