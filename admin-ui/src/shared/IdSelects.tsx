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
    listProductVariants(where: $where, take: $take) { id barcode size concentration packaging }
  }
`;

export function VariantSelect({ value, onChange, label = 'Variant', placeholder = 'Search by barcode or ID' }: { value: string; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const [load, { data }] = useLazyQuery(SEARCH_VARIANTS);
  React.useEffect(() => {
    const h = setTimeout(() => {
      if (q.trim().length >= 2) {
        load({ variables: { where: { OR: [{ barcode: { contains: q, mode: 'insensitive' } }, { id: { equals: q } }] }, take: 10 } });
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, load]);
  const options = (data?.listProductVariants ?? []).map((v: any) => ({ id: v.id, label: `${v.barcode || v.id} ${v.size || ''} ${v.concentration || ''} ${v.packaging || ''}`.trim() }));
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

