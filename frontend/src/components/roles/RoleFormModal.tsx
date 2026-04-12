import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserRole, RolePermissions } from '../../lib/api';

interface RoleFormModalProps {
  role?: UserRole | null;
  onClose: () => void;
  onSubmit: (roleData: { role_name: string; role_description: string; permissions: RolePermissions }) => Promise<void>;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ role, onClose, onSubmit }) => {
  const isEditing = !!role;
  const [roleName, setRoleName] = useState(role?.role_name || '');
  const [roleDescription, setRoleDescription] = useState(role?.role_description || '');
  const [permissions, setPermissions] = useState<RolePermissions>(
    role?.permissions || {
      catalogue: { view: false, order: false },
      dashboard: { view: false, edit: false },
      parties: { view: false, create: false, edit: false, delete: false, export: false, import: false },
      transport: { view: false, create: false, edit: false, delete: false, export: false, import: false },
      designs: { view: false, create: false, edit: false, delete: false, upload: false },
      orders: { view: false, create: false, edit: false, delete: false, fulfill: false, cancel: false },
      users: { view: false, create: false, edit: false, delete: false, manage_roles: false },
      pricing: { view: false, edit: false },
      reports: { view: false, export: false },
      settings: { view: false, edit: false },
      analytics: { view_carts: false, view_wishlists: false, message_users: false },
    }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const permissionSections = [
    { key: 'catalogue', label: 'Catalogue', permissions: ['view', 'order'] },
    { key: 'dashboard', label: 'Dashboard', permissions: ['view', 'edit'] },
    { key: 'parties', label: 'Parties', permissions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
    { key: 'transport', label: 'Transport', permissions: ['view', 'create', 'edit', 'delete', 'export', 'import'] },
    { key: 'designs', label: 'Designs', permissions: ['view', 'create', 'edit', 'delete', 'upload'] },
    { key: 'orders', label: 'Orders', permissions: ['view', 'create', 'edit', 'delete', 'fulfill', 'cancel'] },
    { key: 'users', label: 'Users', permissions: ['view', 'create', 'edit', 'delete', 'manage_roles'] },
    { key: 'pricing', label: 'Pricing', permissions: ['view', 'edit'] },
    { key: 'reports', label: 'Reports', permissions: ['view', 'export'] },
    { key: 'settings', label: 'Settings', permissions: ['view', 'edit'] },
    { key: 'analytics', label: 'Analytics', permissions: ['view_carts', 'view_wishlists', 'message_users'] },
  ];

  const handlePermissionChange = (section: string, permission: string, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof RolePermissions],
        [permission]: value,
      },
    }));
  };

  const handleSelectAll = (section: string) => {
    const sectionConfig = permissionSections.find((s) => s.key === section);
    if (!sectionConfig) return;

    const allPermissions: any = {};
    sectionConfig.permissions.forEach((perm) => {
      allPermissions[perm] = true;
    });

    setPermissions((prev) => ({
      ...prev,
      [section]: allPermissions,
    }));
  };

  const handleDeselectAll = (section: string) => {
    const sectionConfig = permissionSections.find((s) => s.key === section);
    if (!sectionConfig) return;

    const allPermissions: any = {};
    sectionConfig.permissions.forEach((perm) => {
      allPermissions[perm] = false;
    });

    setPermissions((prev) => ({
      ...prev,
      [section]: allPermissions,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roleName.trim()) {
      setError('Role name is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        role_name: roleName,
        role_description: roleDescription,
        permissions,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? `Edit Role: ${role?.role_name}` : 'Create New Role'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={isEditing && role?.is_system_role}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                placeholder="e.g., Manager, Supervisor"
              />
              {isEditing && role?.is_system_role && (
                <p className="text-xs text-gray-500 mt-1">System role names cannot be changed</p>
              )}
            </div>

            {/* Role Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                disabled={isEditing && role?.is_system_role}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                placeholder="Brief description of this role"
              />
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Permissions
              </h3>
              <div className="space-y-6">
                {permissionSections.map((section) => {
                  const sectionPerms = permissions[section.key as keyof RolePermissions] as any;

                  return (
                    <div key={section.key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">{section.label}</h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAll(section.key)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeselectAll(section.key)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {section.permissions.map((perm) => (
                          <label key={perm} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sectionPerms?.[perm] || false}
                              onChange={(e) =>
                                handlePermissionChange(section.key, perm, e.target.checked)
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700 capitalize">
                              {perm.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
