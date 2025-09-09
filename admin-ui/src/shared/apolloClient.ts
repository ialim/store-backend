import { ApolloClient, InMemoryCache, HttpLink, from, ApolloLink, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { notify } from './notify';
import { setContext } from '@apollo/client/link/context';

const httpLink = new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL });

const networkLink = new ApolloLink((operation, forward) => {
  // Notify global listeners that a network request started (after current render)
  if (typeof window !== 'undefined') {
    try { setTimeout(() => window.dispatchEvent(new CustomEvent('app:net:start')), 0); } catch {}
  }
  return new Observable((observer) => {
    const sub = forward(operation).subscribe({
      next: (value) => observer.next(value),
      error: (err) => {
        observer.error(err);
      },
      complete: () => observer.complete(),
    });
    return () => {
      try { setTimeout(() => window.dispatchEvent(new CustomEvent('app:net:end')), 0); } catch {}
      sub.unsubscribe();
    };
  });
});

function isAbortError(err: any) {
  const msg = String(err?.message || '').toLowerCase();
  const name = String(err?.name || '').toLowerCase();
  return (
    name === 'aborterror' ||
    msg.includes('aborted') ||
    msg.includes('abort') ||
    msg.includes('canceled') ||
    msg.includes('cancelled')
  );
}

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const code = (err.extensions?.code as string) || '';
      if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
        notify('Session expired. Please login again.', 'warning');
        // Small delay to allow snackbar render
        setTimeout(() => (window.location.href = '/login'), 200);
        return;
      }
    }
  }
  if (networkError) {
    if (!isAbortError(networkError)) {
      notify('Network error. Please check your connection.', 'error');
    }
  }
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const client = new ApolloClient({
  link: from([networkLink, errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
