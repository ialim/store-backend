import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { CreateQuotationDraft } from '../operations/orders';
import { notify } from '../shared/notify';
import { StoreSelect, UserSelect, VariantSelect } from '../shared/IdSelects';
import { useAuth } from '../shared/AuthProvider';

type CreateQuotationDraftVariables = {
  input: {
    type: 'CONSUMER' | 'RESELLER';
    channel: 'WEB' | 'APP' | 'IN_STORE';
    storeId: string;
    consumerId?: string;
    resellerId?: string;
    billerId?: string;
    items: Array<{ productVariantId: string; quantity: number; unitPrice: number }>;
  };
};

type CreateQuotationDraftResponse = {
  createQuotationDraft: {
    id: string;
    saleOrderId?: string | null;
  };
};

const SALE_TYPES = ['CONSUMER', 'RESELLER'] as const;
const CHANNELS = ['WEB', 'APP', 'IN_STORE'] as const;

type ItemFormRow = {
  productVariantId: string;
  quantity: string;
  unitPrice: string;
};

export default function OrdersQuotationCreate() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isReseller = hasRole('RESELLER');
  const isCustomer = hasRole('CUSTOMER');
  const isPriceReadOnly = isReseller || isCustomer;
  const [type, setType] = React.useState<'CONSUMER' | 'RESELLER'>('CONSUMER');
  const [channel, setChannel] = React.useState<'WEB' | 'APP' | 'IN_STORE'>('IN_STORE');
  const [storeId, setStoreId] = React.useState('');
  const [consumerId, setConsumerId] = React.useState('');
  const [resellerId, setResellerId] = React.useState('');
  const [billerId, setBillerId] = React.useState('');
  const [items, setItems] = React.useState<ItemFormRow[]>([
    { productVariantId: '', quantity: '1', unitPrice: '0' },
  ]);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [createQuotation, { loading, error }] = useMutation<
    CreateQuotationDraftResponse,
    CreateQuotationDraftVariables
  >(CreateQuotationDraft);

  const handleItemChange = (index: number, key: keyof ItemFormRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productVariantId: '', quantity: '1', unitPrice: '0' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetPartyFields = (nextType: 'CONSUMER' | 'RESELLER') => {
    if (nextType === 'CONSUMER') {
      setResellerId('');
    } else {
      setConsumerId('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!storeId.trim()) {
      setFormError('Store ID is required.');
      return;
    }
    if (type === 'CONSUMER' && !consumerId.trim()) {
      setFormError('Consumer ID is required for consumer quotations.');
      return;
    }
    if (type === 'RESELLER' && !resellerId.trim()) {
      setFormError('Reseller ID is required for reseller quotations.');
      return;
    }

    const parsedItems = items
      .map((item) => ({
        productVariantId: item.productVariantId.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }))
      .filter((item) => item.productVariantId && item.quantity > 0 && item.unitPrice >= 0);

    if (!parsedItems.length) {
      setFormError('Add at least one line item with valid values.');
      return;
    }

    try {
      const result = await createQuotation({
        variables: {
          input: {
            type,
            channel,
            storeId: storeId.trim(),
            consumerId: type === 'CONSUMER' ? consumerId.trim() || undefined : undefined,
            resellerId: type === 'RESELLER' ? resellerId.trim() || undefined : undefined,
            billerId: billerId.trim() || undefined,
            items: parsedItems,
          },
        },
      });
      if (result.data?.createQuotationDraft.id) {
        notify('Quotation draft created', 'success');
        navigate(`/orders/quotations/${result.data.createQuotationDraft.id}`);
      } else {
        notify('Quotation created but no ID returned', 'warning');
        navigate('/orders/quotations');
      }
    } catch (submissionError: any) {
      setFormError(submissionError?.message || 'Failed to create quotation');
    }
  };

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Tooltip title="Back to Quotations">
          <IconButton onClick={() => navigate('/orders/quotations')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            New Quotation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a draft quotation. You can convert it to a sale later in the order workflow.
          </Typography>
        </Box>
      </Stack>

      {(formError || error) && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError || error?.message}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid rgba(16,94,62,0.12)' }}
      >
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Quotation Type"
                value={type}
                onChange={(event) => {
                  const next = event.target.value as 'CONSUMER' | 'RESELLER';
                  setType(next);
                  resetPartyFields(next);
                }}
              >
                {SALE_TYPES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Channel"
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value as 'WEB' | 'APP' | 'IN_STORE')
                }
              >
                {CHANNELS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <StoreSelect
                value={storeId}
                onChange={setStoreId}
                label="Store"
                placeholder="Search stores"
              />
            </Grid>
            {type === 'CONSUMER' ? (
              <Grid item xs={12} md={4}>
                <UserSelect
                  value={consumerId}
                  onChange={setConsumerId}
                  label="Consumer"
                  placeholder="Search consumer email"
                />
              </Grid>
            ) : (
              <Grid item xs={12} md={4}>
                <UserSelect
                  value={resellerId}
                  onChange={setResellerId}
                  label="Reseller"
                  placeholder="Search reseller email"
                />
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <UserSelect
                value={billerId}
                onChange={setBillerId}
                label="Biller"
                placeholder="Search biller email"
              />
            </Grid>
          </Grid>

          <Divider />
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Line Items
              </Typography>
              <Button
                type="button"
                onClick={addItem}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
              >
                Add Item
              </Button>
            </Stack>

            {items.map((item, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderColor: 'rgba(16,94,62,0.12)' }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <VariantSelect
                      value={item.productVariantId}
                      onChange={(value) => handleItemChange(index, 'productVariantId', value)}
                      onVariantSelect={(variant) => {
                        if (!variant) {
                          handleItemChange(index, 'unitPrice', '0');
                          return;
                        }
                        const nextPrice =
                          type === 'RESELLER' ? variant.resellerPrice : variant.price;
                        handleItemChange(index, 'unitPrice', String(nextPrice ?? 0));
                      }}
                      label="Product Variant"
                      placeholder="Search by name or barcode"
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      inputProps={{ min: 1 }}
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, 'quantity', event.target.value)
                      }
                      required
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      fullWidth
                      label="Unit Price"
                      type="number"
                      inputProps={{ min: 0, step: '0.01' }}
                      value={item.unitPrice}
                      InputProps={{ readOnly: isPriceReadOnly }}
                      onChange={
                        isPriceReadOnly
                          ? undefined
                          : (event) =>
                              handleItemChange(
                                index,
                                'unitPrice',
                                event.target.value,
                              )
                      }
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={12}>
                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        type="button"
                        color="error"
                        startIcon={<DeleteIcon />}
                        variant="text"
                        disabled={items.length === 1}
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button
          type="button"
          variant="outlined"
          onClick={() => navigate('/orders/quotations')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={loading}
        >
          {loading ? 'Creating…' : 'Create Quotation'}
        </Button>
      </Stack>
    </Stack>
  );
}
