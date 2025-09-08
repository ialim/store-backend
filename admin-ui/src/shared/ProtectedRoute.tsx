import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({
  element,
  roles,
  perms,
}: {
  element: JSX.Element;
  roles?: string[];
  perms?: string[];
}) {
  const { token, hasRole, hasPermission } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  // If roles specified and user has one, allow.
  if (roles && roles.length && hasRole(...roles)) return element;
  // If permissions specified and user has any, allow.
  if (perms && perms.length && hasPermission(...perms)) return element;
  // If either roles or perms were specified but not satisfied, block.
  if ((roles && roles.length) || (perms && perms.length))
    return <Navigate to="/login" replace />;
  // Otherwise, just require auth.
  return element;
}
