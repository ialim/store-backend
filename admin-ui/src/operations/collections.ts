import { gql } from '@apollo/client';

export const Collections = gql`
  query Collections { collections { id name code target filters createdAt } }
`;

export const CreateCollection = gql`
  mutation CreateCollection($input: CreateCollectionInput!) { createCollection(input: $input) { id } }
`;

export const UpdateCollection = gql`
  mutation UpdateCollection($input: UpdateCollectionInput!) { updateCollection(input: $input) { id } }
`;

export const DeleteCollection = gql`
  mutation DeleteCollection($id: String!) { deleteCollection(id: $id) }
`;

export const CollectionMembersCount = gql`
  query CollectionMembersCount($id: String!) { collectionMembersCount(id: $id) }
`;

export const CollectionVariants = gql`
  query CollectionVariants($id: String!, $take: Int, $skip: Int) {
    collectionVariants(id: $id, take: $take, skip: $skip) { id name barcode product { id name } }
  }
`;

export const CollectionProducts = gql`
  query CollectionProducts($id: String!, $take: Int, $skip: Int) {
    collectionProducts(id: $id, take: $take, skip: $skip) { id name barcode }
  }
`;
