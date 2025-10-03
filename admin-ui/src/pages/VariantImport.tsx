import React from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography, List, ListItem, ListItemText } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../shared/AuthProvider';

const GRAPHQL_URL = (import.meta as any).env.VITE_GRAPHQL_URL || '/graphql';
const API_BASE = (import.meta as any).env.VITE_API_BASE || (() => {
  try {
    const abs = new URL(GRAPHQL_URL, window.location.origin);
    return abs.origin;
  } catch {
    return window.location.origin;
  }
})();

interface ImportSummary {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function VariantImport() {
  const { token, hasPermission, hasRole } = useAuth();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const canImport = Boolean(
    token && (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS')),
  );

  const handleSubmit = async () => {
    if (!selectedFile || !canImport) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await fetch(`${API_BASE}/catalogue/variants/import`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed with status ${response.status}`);
      }
      const data = (await response.json()) as ImportSummary;
      setSummary(data);
    } catch (err) {
      setError((err as Error).message ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'IDTARIFAV,CODARTICULO,DESCRIPCION,REFPROVEEDOR,PBRUTO,DTO,PNETO,PBRUTO2,DTO2,PNETO2,PRICEDATE,CODALMACEN,STOCK,STOCKDATE\n';
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'variants_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Import Variants from CSV</Typography>
      {!canImport && (
        <Alert severity="warning">You do not have permission to import variants.</Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography>Upload a CSV file exported from the legacy system.</Typography>
            <List dense>
              <ListItem><ListItemText primary="File must include the standard header row (IDTARIFAV,…,STOCKDATE)." /></ListItem>
              <ListItem><ListItemText primary="Each row creates or updates a variant; SKU/legacy article code is matched." /></ListItem>
              <ListItem><ListItemText primary="Warehouse code RE updates the main store stock quantity." /></ListItem>
              <ListItem><ListItemText primary="Imported variants are not linked to products automatically." /></ListItem>
            </List>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <input
                type="file"
                accept=".csv,text/csv"
                ref={inputRef}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedFile(file);
                  setSummary(null);
                  setError(null);
                }}
              />
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => inputRef.current?.click()}
                disabled={!canImport}
              >
                {selectedFile ? selectedFile.name : 'Choose CSV file'}
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!canImport || !selectedFile || loading}
              >
                {loading ? 'Importing…' : 'Import Variants'}
              </Button>
              <Button variant="text" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
                Download Template
              </Button>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
            {summary && (
              <Alert severity={summary.errors.length ? 'warning' : 'success'}>
                <Box>
                  <Typography variant="subtitle2">Import Summary</Typography>
                  <Typography color="text.secondary">Processed: {summary.processed}</Typography>
                  <Typography color="text.secondary">Created: {summary.created}</Typography>
                  <Typography color="text.secondary">Updated: {summary.updated}</Typography>
                  <Typography color="text.secondary">Skipped: {summary.skipped}</Typography>
                  {summary.errors.length > 0 && (
                    <Box mt={1}>
                      <Typography color="error" variant="body2">Errors:</Typography>
                      <List dense>
                        {summary.errors.slice(0, 10).map((err, idx) => (
                          <ListItem key={idx}>
                            <ListItemText primary={err} />
                          </ListItem>
                        ))}
                        {summary.errors.length > 10 && (
                          <ListItem>
                            <ListItemText primary={`…and ${summary.errors.length - 10} more`} />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}
                </Box>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
