import React from 'react';
import { UserRole, RolePermissions } from '../../lib/api';
import { Shield, Edit2, Trash2, Plus } from 'lucide-react';

interface RolesTabProps {
  roles: UserRole[];
  loading: boolean;
  onSelectRole: (role: UserRole) => void;
  selectedRole: UserRole | null;
  onCreateRole: () => void;
  onEditRole: (role: UserRole) => void;
  onDeleteRole: (role: UserRole) => void;
}

export const RolesTab: React.FC<RolesTabProps> = ({
  roles,
  loading,
  onSelectRole,
  selectedRole,
  onCreateRole,
  onEditRole,
  onDeleteRole
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Roles List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">User Roles</h3>
            <button
              onClick={onCreateRole}
              className="flex items-center space-x-1 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>New Role</span>
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => onSelectRole(role)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-blue-50 border-l-4 border-primary'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{role.role_name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{role.role_description}</p>
                      {role.is_system_role && (
                        <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          System Role
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRole(role);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!role.is_system_role && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRole(role);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="lg:col-span-2">
        {selectedRole ? (
          <RolePermissionsView role={selectedRole} onEdit={onEditRole} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Role Selected</h3>
            <p className="text-gray-500">Select a role from the list to view its permissions</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface RolePermissionsViewProps {
  role: UserRole;
  onEdit: (role: UserRole) => void;
}

const RolePermissionsView: React.FC<RolePermissionsViewProps> = ({ role, onEdit }) => {
  const permissionSections = [
    { key: 'dashboard', label: 'Dashboard', permissions: ['view', 'edit'] },
    { key: 'parties', label: 'Parties', permissions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
    { key: 'transport', label: 'Transport', permissions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
    { key: 'designs', label: 'Designs', permissions: ['view', 'create', 'edit', 'delete', 'upload'] },
    { key: 'orders', label: 'Orders', permissions: ['view', 'create', 'edit', 'delete', 'fulfill', 'cancel'] },
    { key: 'users', label: 'Users', permissions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
    { key: 'pricing', label: 'Pricing', permissions: ['view', 'edit'] },
    { key: 'reports', label: 'Reports', permissions: ['view', 'export'] },
    { key: 'settings', label: 'Settings', permissions: ['view', 'edit'] },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{role.role_name}</h3>
            <p className="text-sm text-gray-500 mt-1">{role.role_description}</p>
          </div>
          <button
            onClick={() => onEdit(role)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Permissions</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Permissions</h4>
        <div className="space-y-6">
          {permissionSections.map((section) => {
            const sectionPerms = role.permissions[section.key as keyof RolePermissions] as any;
            if (!sectionPerms) return null;

            return (
              <div key={section.key} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h5 className="font-medium text-gray-900 mb-3">{section.label}</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {section.permissions.map((perm) => {
                    const hasPermission = sectionPerms[perm];
                    return (
                      <div key={perm} className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            hasPermission
                              ? 'bg-green-500 border-green-500'
                              : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          {hasPermission && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm ${hasPermission ? 'text-gray-900' : 'text-gray-400'}`}>
                          {perm.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
