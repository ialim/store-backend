import React from 'react';
import { Alert, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel, TablePagination, TextField, Box, Button, Stack, Select, MenuItem } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

type Column<Row> = {
  key: string;
  label: string;
  width?: number | string;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  render?: (row: Row, idx: number) => React.ReactNode;
  sort?: boolean;
  accessor?: (row: Row) => any;
  filter?: boolean;
  filterPlaceholder?: string;
};

type Props<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: Row) => void;
  getRowKey?: (row: Row, idx: number) => string | number;
  size?: 'small' | 'medium';
  paginated?: boolean;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  showFilters?: boolean;
  globalSearch?: boolean;
  globalSearchPlaceholder?: string;
  globalSearchKeys?: string[];
  enableUrlState?: boolean;
  urlKey?: string;
  onRowsProcessed?: (payload: { filtered: Row[]; sorted: Row[]; paged: Row[] }) => void;
  onExport?: (payload: { filtered: Row[]; sorted: Row[]; paged: Row[] }) => void;
  exportLabel?: string;
  exportScopeControl?: boolean; // if true, show All vs Current Page toggle
};

export default function TableList<Row = any>({ columns, rows, loading, error, emptyMessage, onRowClick, getRowKey, size = 'small', paginated = true, rowsPerPageOptions = [10, 25, 50], defaultRowsPerPage = 25, defaultSortKey, defaultSortDir = 'asc', showFilters = false, globalSearch = false, globalSearchPlaceholder = 'Search', globalSearchKeys, enableUrlState = false, urlKey = 'tbl', onRowsProcessed, onExport, exportLabel = 'Export CSV', exportScopeControl = false }: Props<Row>) {
  const key = getRowKey || ((_: any, i: number) => i);
  const clickable = Boolean(onRowClick);
  const [searchParams, setSearchParams] = useSearchParams();
  const param = (name: string) => `${urlKey}_${name}`;
  const lastApplied = React.useRef<string | null>(null);
  const initialSortKey = defaultSortKey && columns.find(c => c.key === defaultSortKey && c.sort) ? defaultSortKey : undefined;
  const [orderBy, setOrderBy] = React.useState<string | undefined>(initialSortKey);
  const [order, setOrder] = React.useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [q, setQ] = React.useState('');
  const [dq, setDq] = React.useState('');
  React.useEffect(() => {
    const id = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Load initial state from URL
  React.useEffect(() => {
    if (!enableUrlState) return;
    const sortKey = searchParams.get(param('sort')) || undefined;
    const dir = (searchParams.get(param('dir')) as 'asc' | 'desc') || 'asc';
    const p = parseInt(searchParams.get(param('page')) || '0', 10);
    const rpp = parseInt(searchParams.get(param('rpp')) || `${defaultRowsPerPage}`, 10);
    const q0 = searchParams.get(param('q')) || '';
    if (sortKey && columns.find((c) => c.key === sortKey && c.sort)) {
      setOrderBy(sortKey);
      setOrder(dir === 'desc' ? 'desc' : 'asc');
    }
    if (!Number.isNaN(p) && p >= 0) setPage(p);
    if (!Number.isNaN(rpp) && rpp > 0) setRowsPerPage(rpp);
    setQ(q0);
    setDq(q0);
    // Filters per column
    const nextFilters: Record<string, string> = {};
    columns.forEach((c) => {
      if (c.filter) {
        const v = searchParams.get(param(`f_${c.key}`));
        if (v) nextFilters[c.key] = v;
      }
    });
    if (Object.keys(nextFilters).length) setFilters(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableUrlState]);

  // Persist state to URL
  React.useEffect(() => {
    if (!enableUrlState) return;
    // Start from current URL to preserve unrelated params
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : searchParams.toString());
    if (orderBy) sp.set(param('sort'), orderBy); else sp.delete(param('sort'));
    sp.set(param('dir'), order);
    sp.set(param('page'), String(page));
    sp.set(param('rpp'), String(rowsPerPage));
    if (dq) sp.set(param('q'), dq); else sp.delete(param('q'));
    columns.forEach((c) => {
      const k = param(`f_${c.key}`);
      const v = filters[c.key];
      if (c.filter && v) sp.set(k, v); else sp.delete(k);
    });
    const next = sp.toString();
    if (lastApplied.current === next) return;
    lastApplied.current = next;
    setSearchParams(sp, { replace: true });
  }, [enableUrlState, orderBy, order, page, rowsPerPage, dq, filters, columns, setSearchParams]);

  const filteredRows = React.useMemo(() => {
    // apply per-column text filters
    const active = Object.entries(filters).filter(([_, v]) => (v ?? '').toString().trim().length > 0);
    const lower = (val: any) => (val == null ? '' : String(val)).toLowerCase();

    let base = rows;
    // global search across specified columns (or all columns)
    const query = (dq || '').trim().toLowerCase();
    if (globalSearch && query.length) {
      const searchCols = columns.filter((c) => !globalSearchKeys || globalSearchKeys.includes(c.key));
      base = rows.filter((r: any) => {
        return searchCols.some((c) => {
          const accessor = c.accessor || ((row: any) => (row as any)[c.key]);
          const val = accessor(r);
          return lower(val).includes(query);
        });
      });
    }

    if (!active.length) return base;
    return base.filter((r) => {
      for (const [k, v] of active) {
        const col = columns.find((c) => c.key === k);
        if (!col) continue;
        const accessor = col.accessor || ((row: any) => row[k]);
        const val = accessor(r);
        const needle = v.toLowerCase();
        if (!lower(val).includes(needle)) return false;
      }
      return true;
    });
  }, [rows, filters, columns, globalSearch, dq, globalSearchKeys]);

  const sortedRows = React.useMemo(() => {
    const base = filteredRows;
    if (!orderBy) return base;
    const col = columns.find(c => c.key === orderBy);
    if (!col) return base;
    const accessor = col.accessor || ((r: any) => r[orderBy as any]);
    const copy = [...base];
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = -1;
      else if (bv == null) cmp = 1;
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else if (av instanceof Date || bv instanceof Date) cmp = new Date(av).getTime() - new Date(bv).getTime();
      else cmp = collator.compare(String(av), String(bv));
      return order === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredRows, orderBy, order, columns]);

  const pagedRows = React.useMemo(() => {
    if (!paginated) return sortedRows;
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, paginated, page, rowsPerPage]);

  // Notify parent of current filtered/sorted/paged rows
  const lastProcessedRef = React.useRef<{ filtered: Row[]; sorted: Row[]; paged: Row[] } | null>(null);
  const [exportScope, setExportScope] = React.useState<'all' | 'page'>('all');
  React.useEffect(() => {
    const payload = { filtered: filteredRows, sorted: sortedRows, paged: pagedRows };
    lastProcessedRef.current = payload;
    if (onRowsProcessed) onRowsProcessed(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sortedRows, pagedRows]);

  return (
    <TableContainer component={Paper}>
      {error && <Alert severity="error">{error}</Alert>}
      {(globalSearch || showFilters || onExport) && (
        <Box sx={{ p: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {globalSearch && (
              <TextField
                size="small"
                placeholder={globalSearchPlaceholder}
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                fullWidth
              />
            )}
            {(q || Object.values(filters).some(Boolean)) && (
              <Button onClick={() => { setQ(''); setDq(''); setFilters({}); setPage(0); }} size="small">Clear</Button>
            )}
            {((orderBy && orderBy !== defaultSortKey) || page !== 0 || rowsPerPage !== defaultRowsPerPage || order !== defaultSortDir) && (
              <Button onClick={() => { setOrderBy(defaultSortKey); setOrder(defaultSortDir); setPage(0); setRowsPerPage(defaultRowsPerPage); }} size="small">Reset</Button>
            )}
            {onExport && (
              <>
                {exportScopeControl && (
                  <Select
                    size="small"
                    value={exportScope}
                    onChange={(e) => setExportScope(e.target.value as any)}
                    sx={{ minWidth: 140, ml: 'auto' }}
                  >
                    <MenuItem value="all">Export: All Rows</MenuItem>
                    <MenuItem value="page">Export: Current Page</MenuItem>
                  </Select>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (!lastProcessedRef.current) return;
                    const payload = exportScopeControl && exportScope === 'page'
                      ? { ...lastProcessedRef.current, sorted: lastProcessedRef.current.paged }
                      : lastProcessedRef.current;
                    onExport(payload);
                  }}
                  disabled={!sortedRows.length}
                >
                  {exportLabel}
                </Button>
              </>
            )}
          </Stack>
        </Box>
      )}
      <Table size={size}>
        <TableHead>
          <TableRow>
            {columns.map((c) => {
              const active = orderBy === c.key;
              const canSort = !!c.sort;
              return (
                <TableCell key={c.key} align={c.align} sx={{ width: c.width }}>
                  {canSort ? (
                    <TableSortLabel
                      active={active}
                      direction={active ? order : 'asc'}
                      onClick={() => {
                        if (active) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                        else { setOrderBy(c.key); setOrder('asc'); }
                      }}
                    >
                      {c.label}
                    </TableSortLabel>
                  ) : (
                    c.label
                  )}
                </TableCell>
              );
            })}
          </TableRow>
          {showFilters && (
            <TableRow>
              {columns.map((c) => (
                <TableCell key={`f-${c.key}`} align={c.align}>
                  {c.filter ? (
                    <TextField
                      size="small"
                      placeholder={c.filterPlaceholder || 'Filter'}
                      value={filters[c.key] || ''}
                      onChange={(e) => { setFilters((f) => ({ ...f, [c.key]: e.target.value })); setPage(0); }}
                    />
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableHead>
        <TableBody>
          {loading && rows.length === 0 && (
            [...Array(3)].map((_, i) => (
              <TableRow key={`s-${i}`}>
                {columns.map((c) => (
                  <TableCell key={c.key}><Skeleton variant="text" /></TableCell>
                ))}
              </TableRow>
            ))
          )}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ color: 'text.secondary' }}>
                {emptyMessage || 'No records'}
              </TableCell>
            </TableRow>
          )}
          {pagedRows.map((row, idx) => (
            <TableRow
              key={key(row, idx + page * rowsPerPage)}
              hover={clickable}
              sx={{ cursor: clickable ? 'pointer' : 'default' }}
              onClick={clickable ? () => onRowClick!(row) : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} onClick={(e) => { /* prevent bubbling from interactive controls */ if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) e.stopPropagation(); }}>
                  {c.render ? c.render(row, idx) : (row as any)[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {paginated && (
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </TableContainer>
  );
}
