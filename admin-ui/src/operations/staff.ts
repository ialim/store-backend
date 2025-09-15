import { gql } from '@apollo/client';

export const CreateStaff = gql`mutation CreateStaff($input: CreateStaffInput!) { createStaff(input: $input) { id email } }`;
export const AssignBiller = gql`mutation AssignBiller($input: AssignBillerInput!) { assignBiller(input: $input) { userId billerId } }`;

