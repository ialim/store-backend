import { gql } from '@apollo/client';

export const Stores = gql`query Stores($take: Int, $where: StoreWhereInput) { listStores(take: $take, where: $where) { id name location isMain manager { id email } primaryAddress { formattedAddress } } }`;
export const StoresWithInvalidManagers = gql`query StoresWithInvalidManagers { storesWithInvalidManagers { id name managerId managerEmail validManager } }`;
export const ListManagers = gql`query ListManagers { listManagers { id email customerProfile { fullName } } }`;
export const AssignStoreManager = gql`mutation AssignStoreManager($storeId: String!, $managerId: String!) { assignStoreManager(storeId: $storeId, managerId: $managerId) }`;
export const BulkAssignStoreManager = gql`mutation BulkAssignStoreManager($storeIds: [String!]!, $managerId: String!) { bulkAssignStoreManager(storeIds: $storeIds, managerId: $managerId) }`;
export const CreateStoreWithAddress = gql`
  mutation CreateStoreWithAddress($data: StoreCreateInput!, $address: StoreAddressInput!) {
    createStoreWithAddress(data: $data, address: $address) {
      id
      name
      location
      isMain
      manager { id email }
      primaryAddress {
        id
        formattedAddress
        latitude
        longitude
      }
    }
  }
`;
