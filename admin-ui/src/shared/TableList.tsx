import React from 'react';
import {
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TablePagination,
  TextField,
  Box,
  Button,
  Stack,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  InputBase,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
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
  // Selection helpers
  selectable?: boolean; // show selection checkbox column and header select-all
  selectedIds?: Array<string | number>; // controlled mode; if omitted, internal state is used
  onSelectedIdsChange?: (ids: Array<string | number>) => void;
};

export default function TableList<Row = any>({ columns, rows, loading, error, emptyMessage, onRowClick, getRowKey, size = 'small', paginated = true, rowsPerPageOptions = [10, 25, 50], defaultRowsPerPage = 25, defaultSortKey, defaultSortDir = 'asc', showFilters = false, globalSearch = false, globalSearchPlaceholder = 'Search', globalSearchKeys, enableUrlState = false, urlKey = 'tbl', onRowsProcessed, onExport, exportLabel = 'Export CSV', exportScopeControl = false, selectable = false, selectedIds, onSelectedIdsChange }: Props<Row>) {
  const theme = useTheme();
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

  // Selection state (persist across pages/filters within this component)
  const [internalSelected, setInternalSelected] = React.useState<Set<string | number>>(new Set());
  const isControlled = Array.isArray(selectedIds);
  const selectedSet = React.useMemo(() => {
    return isControlled ? new Set(selectedIds as Array<string | number>) : internalSelected;
  }, [isControlled, selectedIds, internalSelected]);
  const keyFn = getRowKey || ((_: any, i: number) => i);
  const setSelected = (next: Set<string | number>) => {
    if (isControlled) {
      onSelectedIdsChange && onSelectedIdsChange(Array.from(next));
    } else {
      setInternalSelected(new Set(next));
      onSelectedIdsChange && onSelectedIdsChange(Array.from(next));
    }
  };
  const toggleOne = (row: any, idx: number, checked: boolean) => {
    const id = keyFn(row, idx);
    const next = new Set(selectedSet);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };
  const togglePage = (checked: boolean) => {
    const next = new Set(selectedSet);
    pagedRows.forEach((row: any, i: number) => {
      const id = keyFn(row, i + page * rowsPerPage);
      if (checked) next.add(id); else next.delete(id);
    });
    setSelected(next);
  };
  const selectAllFiltered = () => {
    const next = new Set<string | number>(selectedSet);
    filteredRows.forEach((row: any, i: number) => {
      const id = keyFn(row, i);
      next.add(id);
    });
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());
  const selectedCount = selectedSet.size;
  const pageAllSelected = pagedRows.length > 0 && pagedRows.every((row: any, i: number) => selectedSet.has(keyFn(row, i + page * rowsPerPage)));
  const pageSomeSelected = pagedRows.some((row: any, i: number) => selectedSet.has(keyFn(row, i + page * rowsPerPage)));

  const filtersActive = React.useMemo(
    () => Object.values(filters).some((v) => (v ?? '').toString().trim().length > 0),
    [filters]
  );
  const showClearButton = Boolean(q || filtersActive);
  const showResetButton = Boolean(
    orderBy !== initialSortKey ||
    order !== defaultSortDir ||
    page !== 0 ||
    rowsPerPage !== defaultRowsPerPage
  );
  const hasToolbar = globalSearch || showClearButton || showResetButton || onExport || selectable;

  const rowRadius = 18;
  const rowBaseSx = React.useMemo(() => ({
    position: 'relative',
    cursor: clickable ? 'pointer' : 'default',
    '&:before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: rowRadius,
      backgroundColor: '#fff',
      boxShadow: '0 8px 20px rgba(16, 94, 62, 0.08)',
      transition: 'box-shadow 180ms ease, transform 180ms ease, background-color 180ms ease',
      pointerEvents: 'none',
      zIndex: 0,
    },
    '&:hover:before': {
      boxShadow: '0 16px 32px rgba(16, 94, 62, 0.18)',
      transform: 'translateY(-2px)',
      backgroundColor: alpha(theme.palette.success.main, 0.05),
    },
    '& td': {
      position: 'relative',
      zIndex: 1,
      borderBottom: 'none',
      backgroundColor: 'transparent',
      py: 1.75,
      fontSize: 14,
      color: theme.palette.text.primary,
    },
    '& td:first-of-type': {
      borderTopLeftRadius: rowRadius,
      borderBottomLeftRadius: rowRadius,
      paddingLeft: selectable ? theme.spacing(1.5) : theme.spacing(3),
    },
    '& td:last-of-type': {
      borderTopRightRadius: rowRadius,
      borderBottomRightRadius: rowRadius,
      paddingRight: theme.spacing(3),
    },
  }), [clickable, selectable, theme]);

  const searchInput = globalSearch ? (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        maxWidth: { xs: '100%', md: 420 },
        bgcolor: alpha(theme.palette.success.main, 0.08),
        borderRadius: 999,
        px: 2,
        py: 1,
      }}
    >
      <SearchIcon sx={{ color: theme.palette.success.main, opacity: 0.75 }} />
      <InputBase
        fullWidth
        placeholder={globalSearchPlaceholder}
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setPage(0);
        }}
        sx={{ fontWeight: 500 }}
      />
    </Box>
  ) : null;

  const emptyStateColSpan = columns.length + (selectable ? 1 : 0);

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 4,
        p: { xs: 2, md: 3 },
        boxShadow: '0 32px 60px rgba(16, 94, 62, 0.10)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, #ffffff 100%)',
        border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
      }}
    >
      {error && <Alert severity="error">{error}</Alert>}

      {hasToolbar && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            {searchInput && <Box sx={{ flexGrow: 1 }}>{searchInput}</Box>}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              sx={{ flexGrow: searchInput ? 0 : 1 }}
            >
              {showClearButton && (
                <Button size="small" onClick={() => { setQ(''); setDq(''); setFilters({}); setPage(0); }}>
                  Clear Filters
                </Button>
              )}
              {showResetButton && (
                <Button
                  size="small"
                  onClick={() => {
                    setOrderBy(initialSortKey);
                    setOrder(defaultSortDir);
                    setPage(0);
                    setRowsPerPage(defaultRowsPerPage);
                  }}
                >
                  Reset View
                </Button>
              )}
              {onExport && (
                <Stack direction="row" spacing={1} alignItems="center">
                  {exportScopeControl && (
                    <Select
                      size="small"
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value as any)}
                      sx={{ minWidth: 160 }}
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
                </Stack>
              )}
            </Stack>
          </Stack>

          {selectable && (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Selected: {selectedCount}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button size="small" onClick={selectAllFiltered} disabled={!filteredRows.length}>
                  Select All Filtered
                </Button>
                <Button size="small" onClick={clearSelection} disabled={!selectedCount}>
                  Clear Selection
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      )}

      <Table
        size={size}
        sx={{
          borderCollapse: 'separate',
          borderSpacing: '0 14px',
          minWidth: 650,
        }}
      >
        <TableHead
          sx={{
            '& .MuiTableRow-root': {
              backgroundColor: theme.palette.success.main,
              '& .MuiTableCell-root': {
                color: '#fff',
                fontWeight: 700,
                borderBottom: 'none',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 13,
                py: 1.6,
              },
              '& .MuiTableCell-root:first-of-type': {
                borderTopLeftRadius: 18,
                borderBottomLeftRadius: 18,
              },
              '& .MuiTableCell-root:last-of-type': {
                borderTopRightRadius: 18,
                borderBottomRightRadius: 18,
              },
            },
          }}
        >
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={!pageAllSelected && pageSomeSelected}
                  checked={pageAllSelected}
                  onChange={(e) => togglePage(e.target.checked)}
                  sx={{ color: '#fff' }}
                />
              </TableCell>
            )}
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
                        else {
                          setOrderBy(c.key);
                          setOrder('asc');
                        }
                      }}
                      sx={{
                        color: '#fff',
                        '&.Mui-active': { color: '#fff' },
                        '& .MuiTableSortLabel-icon': {
                          color: '#fff !important',
                        },
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
              {selectable && <TableCell padding="checkbox" />}
              {columns.map((c) => (
                <TableCell key={`f-${c.key}`} align={c.align} sx={{ bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                  {c.filter ? (
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={c.filterPlaceholder || 'Filter'}
                      value={filters[c.key] || ''}
                      onChange={(e) => {
                        setFilters((f) => ({ ...f, [c.key]: e.target.value }));
                        setPage(0);
                      }}
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
              <TableRow key={`s-${i}`} sx={{ ...rowBaseSx, cursor: 'default' }}>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Skeleton variant="circular" width={20} height={20} />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={`${c.key}-sk-${i}`}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
          {!loading && rows.length === 0 && (
            <TableRow sx={rowBaseSx}>
              <TableCell colSpan={emptyStateColSpan} align="center" sx={{ py: 3, fontSize: 14, color: theme.palette.text.secondary }}>
                {emptyMessage || 'No records'}
              </TableCell>
            </TableRow>
          )}
          {pagedRows.map((row, idx) => (
            <TableRow
              key={key(row, idx + page * rowsPerPage)}
              hover={clickable}
              sx={rowBaseSx}
              onClick={clickable ? () => onRowClick!(row) : undefined}
            >
              {selectable && (
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ width: 52 }}>
                  <Checkbox
                    checked={selectedSet.has(key(row, idx + page * rowsPerPage))}
                    onChange={(e) => toggleOne(row, idx + page * rowsPerPage, e.target.checked)}
                  />
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) e.stopPropagation();
                  }}
                >
                  {c.render ? c.render(row, idx) : (row as any)[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {paginated && (
        <Box sx={{ mt: 2 }}>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={rowsPerPageOptions}
          />
        </Box>
      )}
    </TableContainer>
  );
}
