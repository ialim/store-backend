import React from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { Autocomplete, TextField } from '@mui/material';

const SEARCH_USERS = gql`
  query SearchUsers($where: UserWhereInput, $take: Int) {
    listUsers(where: $where, take: $take) { id email }
  }
`;

export function UserSelect({ value, onChange, label = 'User', placeholder = 'Search by email' }: { value: string; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_USERS);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        load({ variables: { where: { email: { contains: q, mode: 'insensitive' } }, take: 10 } });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options = (data?.listUsers ?? []).map((u: any) => ({ id: u.id, label: u.email }));
  const current = options.find((o: any) => o.id === value) || (value ? { id: value, label: value } : null);
  return (
    <Autocomplete
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, v) => setQ(v)}
      onChange={(_, v: any) => onChange(v?.id || '')}
      renderInput={(params) => <TextField {...params} label={label} size="small" placeholder={placeholder} />}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      clearOnBlur={false}
      freeSolo
    />
  );
}

const SEARCH_ORDER_RESELLERS = gql`
  query OrderResellers($q: String, $take: Int) {
    orderResellers(q: $q, take: $take) {
      user {
        id
        email
      }
    }
  }
`;

export function ResellerSelect({
  value,
  onChange,
  label = 'Reseller',
  placeholder = 'Search reseller email',
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_ORDER_RESELLERS);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const term = q.trim();
      if (term.length >= 2) {
        load({ variables: { q: term, take: 10 } });
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, load]);

  const options: Array<{ id: string; label: string }> =
    (data?.orderResellers ?? [])
      .map((entry: any) =>
        entry?.user ? { id: entry.user.id, label: entry.user.email ?? entry.user.id } : null,
      )
      .filter((option: any): option is { id: string; label: string } => Boolean(option)) ?? [];

  const current =
    options.find((option) => option.id === value) ||
    (value ? { id: value, label: value } : null);

  return (
    <Autocomplete
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, next) => setQ(next)}
      onChange={(_, selection: any) => onChange(selection?.id || '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          placeholder={placeholder}
        />
      )}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      clearOnBlur={false}
      freeSolo
    />
  );
}

const SEARCH_STORES = gql`
  query SearchStores($where: StoreWhereInput, $take: Int) {
    listStores(where: $where, take: $take) { id name location }
  }
`;

export function StoreSelect({ value, onChange, label = 'Store', placeholder = 'Search by name or location' }: { value: string; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_STORES);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        load({ variables: { where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { location: { contains: q, mode: 'insensitive' } }] }, take: 10 } });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options = (data?.listStores ?? []).map((s: any) => ({ id: s.id, label: `${s.name}${s.location ? ' • ' + s.location : ''}` }));
  const current = options.find((o: any) => o.id === value) || (value ? { id: value, label: value } : null);
  return (
    <Autocomplete
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, v) => setQ(v)}
      onChange={(_, v: any) => onChange(v?.id || '')}
      renderInput={(params) => <TextField {...params} label={label} size="small" placeholder={placeholder} />}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      clearOnBlur={false}
      freeSolo
    />
  );
}

const SEARCH_VARIANTS = gql`
  query SearchVariants($where: ProductVariantWhereInput, $take: Int) {
    listProductVariants(where: $where, take: $take) {
      id
      name
      barcode
      price
      resellerPrice
      product { id name }
    }
  }
`;

const SEARCH_SUPPLIERS = gql`
  query SearchSuppliers($where: SupplierWhereInput, $take: Int) {
    listSuppliers(where: $where, take: $take) { id name }
  }
`;

type VariantSelectOption = {
  id: string;
  label: string;
  variant?: {
    id: string;
    name?: string | null;
    barcode?: string | null;
    price: number;
    resellerPrice: number;
    product?: { id: string; name: string } | null;
  };
};

export function VariantSelect({
  value,
  onChange,
  onVariantSelect,
  label = 'Variant',
  placeholder = 'Search by name, barcode, or ID',
}: {
  value: string;
  onChange: (id: string) => void;
  onVariantSelect?: (variant: VariantSelectOption['variant'] | null) => void;
  label?: string;
  placeholder?: string;
}) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_VARIANTS);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        const term = q.trim();
        load({
          variables: {
            where: {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { product: { is: { name: { contains: term, mode: 'insensitive' } } } },
                { barcode: { contains: term, mode: 'insensitive' } },
                { id: { equals: term } },
              ],
            },
            take: 10,
          },
        });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options: VariantSelectOption[] = (data?.listProductVariants ?? []).map((v: any) => ({
    id: v.id,
    label: v.name || v.product?.name || v.barcode || v.id,
    variant: v,
  }));
  const fallbackOption = value ? ({ id: value, label: value } as VariantSelectOption) : null;
  const current = options.find((o) => o.id === value) || fallbackOption;
  return (
    <Autocomplete<VariantSelectOption, false, false, true>
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, v) => setQ(v)}
      onChange={(_, newValue) => {
        const option = typeof newValue === 'string' ? null : newValue;
        const nextId =
          typeof newValue === 'string'
            ? newValue
            : option?.id || '';
        onChange(nextId);
        if (onVariantSelect) {
          onVariantSelect(option?.variant ?? null);
        }
      }}
      renderInput={(params) => <TextField {...params} label={label} size="small" placeholder={placeholder} />}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      clearOnBlur={false}
      freeSolo
    />
  );
}

export function SupplierSelect({ value, onChange, label = 'Supplier', placeholder = 'Search supplier name' }: { value: string; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_SUPPLIERS);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        load({ variables: { where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { id: { equals: q } }] }, take: 20 } });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options = (data?.listSuppliers ?? []).map((s: any) => ({ id: s.id, label: s.name || s.id }));
  const current = options.find((o: any) => o.id === value) || (value ? { id: value, label: value } : null);
  return (
    <Autocomplete
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, v) => setQ(v)}
      onChange={(_, v: any) => onChange(v?.id || '')}
      renderInput={(params) => <TextField {...params} label={label} size="small" placeholder={placeholder} />}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      clearOnBlur={false}
      freeSolo
    />
  );
}

export function SupplierNameSelect({ value, onChange, label = 'Supplier', placeholder = 'Search supplier name' }: { value: string; onChange: (name: string) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_SUPPLIERS);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        load({ variables: { where: { name: { contains: q, mode: 'insensitive' } }, take: 20 } });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options = (data?.listSuppliers ?? []).map((s: any) => ({ id: s.id, label: s.name || s.id }));
  const current = value ? { id: options.find((o: any) => o.label === value)?.id || value, label: value } : null;
  return (
    <Autocomplete
      options={options}
      value={current}
      inputValue={q}
      onInputChange={(_, v) => setQ(v)}
      onChange={(_, v: any) => onChange(v?.label || '')}
      renderInput={(params) => <TextField {...params} label={label} size="small" placeholder={placeholder} />}
      isOptionEqualToValue={(a, b) => a.label === b.label}
      clearOnBlur={false}
      freeSolo
    />
  );
}
