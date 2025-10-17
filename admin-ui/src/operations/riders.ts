import { gql } from '@apollo/client';

export const ListRiders = gql`
  query ListRiders($take: Int) {
    listUsers(
      take: $take
      where: { role: { is: { name: { equals: "RIDER" } } } }
    ) {
      id
      email
      createdAt
      role {
        name
      }
      customerProfile {
        fullName
      }
    }
  }
`;

export const RiderCoverageAreas = gql`
  query RiderCoverageAreas($riderId: String!) {
    riderCoverageAreas(riderId: $riderId) {
      id
      storeId
      serviceRadiusKm
      createdAt
      store {
        id
        name
      }
    }
  }
`;

export const UpsertRiderCoverage = gql`
  mutation UpsertRiderCoverage($input: UpsertRiderCoverageInput!) {
    upsertRiderCoverage(input: $input) {
      id
      storeId
      serviceRadiusKm
      createdAt
      store {
        id
        name
      }
    }
  }
`;
