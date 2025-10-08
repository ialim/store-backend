import { gql } from '@apollo/client';

export const AssetAssignmentsDocument = gql`
  query AssetAssignments($entityType: AssetEntityType!, $entityId: String!) {
    assetAssignments(input: { entityType: $entityType, entityId: $entityId }) {
      id
      assetId
      entityType
      entityId
      isPrimary
      createdAt
      updatedAt
      asset {
        id
        kind
        url
        filename
        mimetype
        size
        metadata
        createdAt
      }
    }
  }
`;

export const PrimaryAssetAssignmentDocument = gql`
  query PrimaryAssetAssignment($entityType: AssetEntityType!, $entityId: String!) {
    primaryAssetAssignment(input: { entityType: $entityType, entityId: $entityId }) {
      id
      assetId
      entityType
      entityId
      isPrimary
      asset {
        id
        kind
        url
        filename
        mimetype
      }
    }
  }
`;

export const AssignAssetDocument = gql`
  mutation AssignAsset(
    $assetId: String!
    $entityType: AssetEntityType!
    $entityId: String!
    $isPrimary: Boolean
  ) {
    assignAsset(
      input: {
        assetId: $assetId
        entityType: $entityType
        entityId: $entityId
        isPrimary: $isPrimary
      }
    ) {
      id
      assetId
      entityType
      entityId
      isPrimary
    }
  }
`;

export const UnassignAssetDocument = gql`
  mutation UnassignAsset(
    $assetId: String!
    $entityType: AssetEntityType!
    $entityId: String!
  ) {
    unassignAsset(
      input: { assetId: $assetId, entityType: $entityType, entityId: $entityId }
    )
  }
`;

export const RemoveAssetDocument = gql`
  mutation RemoveAsset($assetId: String!) {
    removeAsset(assetId: $assetId)
  }
`;

export const AssetsDocument = gql`
  query Assets($take: Int, $skip: Int) {
    assets(take: $take, skip: $skip, orderBy: [{ createdAt: desc }]) {
      id
      kind
      bucket
      key
      url
      filename
      mimetype
      size
      createdAt
      updatedAt
      assignments {
        id
        entityType
        entityId
        isPrimary
      }
    }
  }
`;
