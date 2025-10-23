import { graphqlRequest } from './graphqlClient';

const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        role {
          id
          name
        }
      }
    }
  }
`;

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      role {
        id
        name
        permissions {
          name
        }
      }
    }
  }
`;

type LoginVariables = {
  input: {
    email: string;
    password: string;
  };
};

type LoginResult = {
  login: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: {
        id: string;
        name: string;
      } | null;
    };
  };
};

type MeResult = {
  me: {
    id: string;
    email: string;
    role: {
      id: string;
      name: string;
      permissions: { name: string }[];
    } | null;
  } | null;
};

export async function login(email: string, password: string) {
  const variables: LoginVariables = {
    input: {
      email,
      password,
    },
  };
  const data = await graphqlRequest<LoginResult>({
    query: LOGIN_MUTATION,
    variables,
  });

  return data.login;
}

export async function fetchMe(token: string) {
  const data = await graphqlRequest<MeResult>({
    query: ME_QUERY,
    token,
  });
  return data.me;
}
