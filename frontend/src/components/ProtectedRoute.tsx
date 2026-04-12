import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RolePermissions } from '../lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requirePermission?: {
    module: keyof RolePermissions;
    action: string;
  };
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requirePermission, requireAdmin }: ProtectedRouteProps) {
  const { user, loading, hasPermission, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Admin access required.</p>
        </div>
      </div>
    );
  }

  // Check specific permission requirement
  if (requirePermission) {
    const { module, action } = requirePermission;
    if (!hasPermission(module, action)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500 mt-2">
              Required permission: {action} access to {module}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
