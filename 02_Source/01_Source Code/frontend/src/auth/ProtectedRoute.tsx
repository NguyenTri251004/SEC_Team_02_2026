import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles = [] }: ProtectedRouteProps) => {
  const { userRoles } = useAuth();

  // If specific roles are required for this page, check them
  if (allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  // If they have the role, render the page
  return <Outlet />;
};