import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
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
import { QuotationDetail, UpdateQuotation } from '../operations/orders';
import { notify } from '../shared/notify';
import { StoreSelect, UserSelect, VariantSelect } from '../shared/IdSelects';

type QuotationDetailData = {
  quotation: {
    id: string;
    type: 'CONSUMER' | 'RESELLER';
    channel: 'WEB' | 'APP' | 'IN_STORE';
    storeId: string;
    consumerId?: string | null;
    resellerId?: string | null;
    billerId?: string | null;
    status: string;
    items: Array<{
      productVariantId: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
};

type UpdateQuotationVars = {
  input: {
    id: string;
    type?: 'CONSUMER' | 'RESELLER';
    channel?: 'WEB' | 'APP' | 'IN_STORE';
    storeId?: string;
    consumerId?: string | null;
    resellerId?: string | null;
    billerId?: string | null;
    items?: Array<{ productVariantId: string; quantity: number; unitPrice: number }>;
  };
};

type UpdateQuotationResponse = {
  updateQuotation: {
    id: string;
    status: string;
  };
};

const SALE_TYPES = ['CONSUMER', 'RESELLER'] as const;
const CHANNELS = ['WEB', 'APP', 'IN_STORE'] as const;

type ItemFormRow = {
  productVariantId: string;
  quantity: string;
  unitPrice: string;
};

export default function OrdersQuotationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data, loading: loadingDetail, error: detailError } =
    useQuery<QuotationDetailData>(QuotationDetail, {
      variables: { id: id ?? '' },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    });

  const quotation = data?.quotation;

  const [type, setType] = React.useState<'CONSUMER' | 'RESELLER'>('CONSUMER');
  const [channel, setChannel] = React.useState<'WEB' | 'APP' | 'IN_STORE'>('IN_STORE');
  const [storeId, setStoreId] = React.useState('');
  const [consumerId, setConsumerId] = React.useState('');
  const [resellerId, setResellerId] = React.useState('');
  const [billerId, setBillerId] = React.useState('');
  const [items, setItems] = React.useState<ItemFormRow[]>([
    { productVariantId: '', quantity: '1', unitPrice: '0' },
  ]);

  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (quotation && !initialized.current) {
      initialized.current = true;
      setType(quotation.type);
      setChannel(quotation.channel);
      setStoreId(quotation.storeId);
      setConsumerId(quotation.consumerId ?? '');
      setResellerId(quotation.resellerId ?? '');
      setBillerId(quotation.billerId ?? '');
      setItems(
        quotation.items.length
          ? quotation.items.map((item) => ({
              productVariantId: item.productVariantId,
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice),
            }))
          : [{ productVariantId: '', quantity: '1', unitPrice: '0' }],
      );
    }
  }, [quotation]);

  const [updateQuotation, { loading: updating, error: updateError }] = useMutation<
    UpdateQuotationResponse,
    UpdateQuotationVars
  >(UpdateQuotation);

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
    if (!id) return;
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
      .filter(
        (item) =>
          item.productVariantId &&
          Number.isFinite(item.quantity) &&
          Number.isFinite(item.unitPrice) &&
          item.quantity > 0 &&
          item.unitPrice >= 0,
      );

    if (!parsedItems.length) {
      setFormError('Add at least one line item with valid values.');
      return;
    }

    try {
      const result = await updateQuotation({
        variables: {
          input: {
            id,
            type,
            channel,
            storeId: storeId.trim(),
            consumerId:
              type === 'CONSUMER' ? consumerId.trim() || null : null,
            resellerId:
              type === 'RESELLER' ? resellerId.trim() || null : null,
            billerId: billerId.trim() || null,
            items: parsedItems,
          },
        },
      });
      if (result.data?.updateQuotation.id) {
        notify('Quotation updated', 'success');
        navigate(`/orders/quotations/${id}`);
      }
    } catch (submissionError: any) {
      setFormError(submissionError?.message || 'Failed to update quotation');
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
            Edit Quotation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update quotation details. Only draft or sent quotations can be edited.
          </Typography>
        </Box>
      </Stack>

      {(formError || updateError || detailError) && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError || updateError?.message || detailError?.message}
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
                      onChange={(value) =>
                        handleItemChange(index, 'productVariantId', value)
                      }
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
                      onChange={(event) =>
                        handleItemChange(index, 'unitPrice', event.target.value)
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
          onClick={() => navigate(`/orders/quotations/${id}`)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={updating || loadingDetail}
        >
          {updating ? 'Updating…' : 'Update Quotation'}
        </Button>
      </Stack>
    </Stack>
  );
}
