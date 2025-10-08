import { gql } from '@apollo/client';

export const RolesDocument = gql`
  query Roles {
    roles {
      id
      name
      description
      createdAt
      permissions {
        id
        name
        module
        action
      }
    }
  }
`;

export const RolePermissionsDocument = gql`
  query RolePermissions {
    rolePermissions {
      id
      name
      module
      action
    }
  }
`;

export const CreateRoleDocument = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      permissions {
        id
        name
        module
        action
      }
    }
  }
`;

export const UpdateRoleDocument = gql`
  mutation UpdateRole($roleId: String!, $input: UpdateRoleInput!) {
    updateRole(roleId: $roleId, input: $input) {
      id
      name
      description
      permissions {
        id
        name
        module
        action
      }
    }
  }
`;

export const DeleteRoleDocument = gql`
  mutation DeleteRole($roleId: String!) {
    deleteRole(roleId: $roleId)
  }
`;

export const AssignRoleDocument = gql`
  mutation AssignRole($input: AssignRoleInput!) {
    assignRole(input: $input)
  }
`;
