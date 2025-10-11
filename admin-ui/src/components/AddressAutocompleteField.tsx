import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { gql, useLazyQuery } from '@apollo/client';

type Suggestion = {
  id: string;
  formattedAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
  provider: string;
};

const SEARCH_ADDRESSES = gql`
  query SearchAddresses($query: String!, $countryCodes: [String!], $limit: Int) {
    searchAddresses(query: $query, countryCodes: $countryCodes, limit: $limit) {
      id
      formattedAddress
      latitude
      longitude
      countryCode
      provider
    }
  }
`;

type AddressAutocompleteFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  countryCode?: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: Suggestion | null) => void;
};

export function AddressAutocompleteField({
  label = 'Address',
  placeholder = 'Start typing an address…',
  value,
  countryCode,
  onChange,
  onSelect,
}: AddressAutocompleteFieldProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [loadSuggestions, { data, loading }] = useLazyQuery<{
    searchAddresses: Suggestion[];
  }>(SEARCH_ADDRESSES, { fetchPolicy: 'no-cache' });

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 3) return;
    const handle = setTimeout(() => {
      loadSuggestions({
        variables: {
          query: trimmed,
          countryCodes: countryCode ? [countryCode] : undefined,
          limit: 5,
        },
      }).catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [inputValue, countryCode, loadSuggestions]);

  const suggestions = data?.searchAddresses ?? [];

  return (
    <Autocomplete
      freeSolo
      options={suggestions}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.formattedAddress
      }
      filterOptions={(opts) => opts}
      loading={loading}
      value={value}
      inputValue={inputValue}
      onInputChange={(event, newValue, reason) => {
        setInputValue(newValue);
        if (reason === 'input') {
          onChange(newValue);
        }
      }}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
          onSelect(null);
        } else {
          onChange(newValue?.formattedAddress ?? '');
          onSelect(newValue ?? null);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
}
