import { gql } from '@apollo/client';

export const ListAddresses = gql`
  query ListAddresses($where: AddressWhereInput, $take: Int, $skip: Int) {
    listAddresses(where: $where, take: $take, skip: $skip) {
      id
      formattedAddress
      city
      state
      countryCode
      latitude
      longitude
      provider
      createdAt
    }
  }
`;

export const CreateVerifiedAddress = gql`
  mutation CreateVerifiedAddress($input: CreateVerifiedAddressInput!) {
    createVerifiedAddress(input: $input) {
      id
      formattedAddress
      latitude
      longitude
      provider
      assignments {
        id
        ownerType
        ownerId
        label
        isPrimary
      }
    }
  }
`;

export const AttachAddressToOwner = gql`
  mutation AttachAddress($input: AttachAddressInput!) {
    attachAddress(input: $input) {
      id
      addressId
      ownerType
      ownerId
      label
      isPrimary
    }
  }
`;
