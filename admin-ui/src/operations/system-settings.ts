import { gql } from '@apollo/client';

export const SystemSettings = gql`
  query SystemSettings {
    systemSettingsList {
      key
      valueType
      numberValue
      booleanValue
      stringValue
      defaultNumberValue
      defaultBooleanValue
      defaultStringValue
      envNumberValue
      envBooleanValue
      envStringValue
      description
      metadata
      source
      updatedAt
      updatedBy {
        id
        email
        fullName
      }
    }
  }
`;

export const UpdateSystemSetting = gql`
  mutation UpdateSystemSetting($input: UpdateSystemSettingInput!) {
    updateSystemSetting(input: $input) {
      key
      valueType
      numberValue
      booleanValue
      stringValue
      defaultNumberValue
      defaultBooleanValue
      defaultStringValue
      envNumberValue
      envBooleanValue
      envStringValue
      description
      metadata
      source
      updatedAt
      updatedBy {
        id
        email
        fullName
      }
    }
  }
`;
