import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/AuthProvider';
import { getDefaultRoute } from '../shared/routes';

export default function IndexRedirect() {
  const { token, user } = useAuth();
  const to = token ? getDefaultRoute(user?.roleName) : '/login';
  return <Navigate to={to} replace />;
}
