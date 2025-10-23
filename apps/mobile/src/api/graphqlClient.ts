import { GRAPHQL_ENDPOINT } from '../config';

export type GraphqlRequestOptions = {
  query: string;
  variables?: Record<string, unknown>;
  token?: string | null;
};

type GraphqlError = {
  message: string;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: GraphqlError[];
};

export class GraphqlRequestError extends Error {
  constructor(message: string, readonly response?: GraphqlResponse<unknown>) {
    super(message);
    this.name = 'GraphqlRequestError';
  }
}

export async function graphqlRequest<T>({
  query,
  variables,
  token,
}: GraphqlRequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GraphqlRequestError(
      `GraphQL request failed with status ${res.status}: ${text}`,
    );
  }

  const json = (await res.json()) as GraphqlResponse<T>;

  if (json.errors?.length) {
    throw new GraphqlRequestError(json.errors[0]?.message ?? 'GraphQL error', json);
  }
  if (!json.data) {
    throw new GraphqlRequestError('GraphQL response missing data', json);
  }
  return json.data;
}
