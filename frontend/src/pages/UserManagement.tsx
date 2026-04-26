import { useState, useEffect, useCallback } from 'react';
import { api, UserProfile, Party, LoginHistory, UserRole } from '../lib/api';
import { UserPlus, Edit2, XCircle, CheckCircle, Trash2, Users, Clock, UserX, Activity, LogIn, Shield } from 'lucide-react';
import { formatDate, getRelativeTime } from '../utils/dateUtils';
import { ErrorAlert, Breadcrumb } from '../components';
import { RolesTab } from '../components/roles/RolesTab';
import { RoleFormModal } from '../components/roles/RoleFormModal';
import { PartyAssociationsModal } from '../components/users/PartyAssociationsModal';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'users' | 'login-history' | 'inactive-users' | 'roles';

export function UserManagement() {
  const { hasPermission, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [managingPartiesUser, setManagingPartiesUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      switch (activeTab) {
        case 'users':
          await loadUsers();
          break;
        case 'login-history':
          await loadLoginHistory();
          break;
        case 'inactive-users':
          await loadInactiveUsers();
          break;
        case 'roles':
          await loadRoles();
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadUsers = useCallback(async () => {
    const data = await api.getUsers();
    setUsers(data);
  }, []);

  const loadLoginHistory = useCallback(async () => {
    try {
      console.log('[Frontend] Fetching login history...');
      const data = await api.getLoginHistory(50);
      console.log('[Frontend] Login history response:', data);
      setLoginHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Frontend] Login history fetch failed:', err);
      throw err;
    }
  }, []);

  const loadInactiveUsers = useCallback(async () => {
    const data = await api.getInactiveUsers(30);
    setInactiveUsers(data);
  }, []);

  const loadRoles = useCallback(async () => {
    const data = await api.getRoles();
    setRoles(data.roles);
    if (data.roles.length > 0 && !selectedRole) {
      setSelectedRole(data.roles[0]);
    }
  }, [selectedRole]);

  const handleToggleActive = useCallback(async (user: UserProfile) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }, [loadUsers]);

  const handleDeleteUser = useCallback(async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to delete user "${user.full_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteUser(user.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }, [loadUsers]);

  const handleCreateRole = useCallback(() => {
    setEditingRole(null);
    setShowRoleModal(true);
  }, []);

  const handleEditRole = useCallback((role: UserRole) => {
    setEditingRole(role);
    setShowRoleModal(true);
  }, []);

  const handleDeleteRole = useCallback(async (role: UserRole) => {
    if (!confirm(`Are you sure you want to delete role "${role.role_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteRole(role.id);
      await loadRoles();
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    }
  }, [loadRoles, selectedRole]);

  const handleRoleSubmit = useCallback(async (roleData: any) => {
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleData);
      } else {
        await api.createRole(roleData);
      }
      await loadRoles();
      await refreshUser();
      setShowRoleModal(false);
      setEditingRole(null);
    } catch (err) {
      throw err;
    }
  }, [editingRole, loadRoles, refreshUser]);

  const tabs = [
    ...(hasPermission('users', 'view') ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    ...(hasPermission('users', 'view') ? [{ id: 'login-history', label: 'Login History', icon: Clock }] : []),
    ...(hasPermission('users', 'view') ? [{ id: 'inactive-users', label: 'Inactive Users', icon: UserX }] : []),
    ...(hasPermission('users', 'manage_roles') ? [{ id: 'roles', label: 'User Roles', icon: Shield }] : []),
  ];

  if (loading && (users.length === 0 && loginHistory.length === 0 && inactiveUsers.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-2 sm:pb-8">
      <Breadcrumb />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage users and monitor activity</p>
        </div>

        {activeTab === 'users' && hasPermission('users', 'create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 w-full sm:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Create User</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} className="mb-6" />

      {/* Tab Content */}
      {activeTab === 'users' && hasPermission('users', 'view') && (
        <UsersTab
          users={users}
          loading={loading}
          onEdit={setEditingUser}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteUser}
        />
      )}

      {activeTab === 'login-history' && hasPermission('users', 'view') && (
        <LoginHistoryTab
          loginHistory={loginHistory}
          loading={loading}
          formatDate={formatDate}
          getRelativeTime={getRelativeTime}
        />
      )}

      {activeTab === 'inactive-users' && hasPermission('users', 'view') && (
        <InactiveUsersTab
          inactiveUsers={inactiveUsers}
          loading={loading}
          formatDate={formatDate}
          getRelativeTime={getRelativeTime}
          onToggleActive={handleToggleActive}
        />
      )}

      {activeTab === 'roles' && hasPermission('users', 'manage_roles') && (
        <RolesTab
          roles={roles}
          loading={loading}
          onSelectRole={setSelectedRole}
          selectedRole={selectedRole}
          onCreateRole={handleCreateRole}
          onEditRole={handleEditRole}
          onDeleteRole={handleDeleteRole}
        />
      )}

      {showCreateModal && hasPermission('users', 'create') && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadUsers();
          }}
        />
      )}

      {editingUser && hasPermission('users', 'edit') && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}

      {showRoleModal && hasPermission('users', 'manage_roles') && (
        <RoleFormModal
          role={editingRole}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          onSubmit={handleRoleSubmit}
        />
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, loading, onEdit, onToggleActive, onDelete }: {
  users: UserProfile[];
  loading: boolean;
  onEdit: (user: UserProfile) => void;
  onToggleActive: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role
              </th>
              <th className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Party
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-xs sm:text-sm font-medium text-gray-900">{user.full_name}</div>
                  <div className="md:hidden text-xs text-gray-500 mt-0.5">{user.email}</div>
                </td>
                <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{user.email}</div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      user.user_roles?.role_name === 'Admin'
                        ? 'bg-blue-100 text-blue-800'
                        : user.user_roles?.role_name === 'Retailer'
                        ? 'bg-green-100 text-green-800'
                        : user.user_roles?.role_name === 'Distributor'
                        ? 'bg-purple-100 text-purple-800'
                        : user.user_roles?.role_name === 'Sales'
                        ? 'bg-orange-100 text-orange-800'
                        : user.user_roles?.role_name === 'Staff'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.user_roles?.role_name || 'Unknown'}
                  </span>
                </td>
                <td className="hidden xl:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {user.user_roles?.role_name === 'Retailer' ? user.parties?.name ?? '-' : '-'}
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2 sm:space-x-3">
                    <button
                      onClick={() => onEdit(user)}
                      className="text-blue-600 hover:text-blue-800 transition p-1 rounded hover:bg-blue-50"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    <button
                      onClick={() => onToggleActive(user)}
                      className={`transition p-1 rounded ${
                        user.is_active 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      title={user.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.is_active ? (
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => onDelete(user)}
                      className="text-red-600 hover:text-red-800 transition p-1 rounded hover:bg-red-50"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Login History Tab Component
function LoginHistoryTab({ loginHistory, loading, formatDate, getRelativeTime }: {
  loginHistory: LoginHistory[];
  loading: boolean;
  formatDate: (date: string) => string;
  getRelativeTime: (date: string) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading login history...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Login Time
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Logout Time
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loginHistory.map((login) => (
              <tr key={login.id} className="hover:bg-gray-50 transition">
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{login.user.full_name}</div>
                    <div className="text-xs text-gray-500">{login.user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        login.user.role_name?.toLowerCase() === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : login.user.role_name?.toLowerCase() === 'retailer'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {login.user.role_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(login.login_time)}</div>
                  <div className="text-xs text-gray-500">{getRelativeTime(login.login_time)}</div>
                </td>
                <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  {login.logout_time ? (
                    <div>
                      <div className="text-sm text-gray-900">{formatDate(login.logout_time)}</div>
                      <div className="text-xs text-gray-500">{getRelativeTime(login.logout_time)}</div>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-green-600">
                      <Activity className="w-4 h-4 mr-1" />
                      Active
                    </div>
                  )}
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {login.success ? (
                      <>
                        <LogIn className="w-4 h-4 text-green-500 mr-2" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Success
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600">
                  {login.ip_address || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inactive Users Tab Component
function InactiveUsersTab({ inactiveUsers, loading, formatDate, getRelativeTime, onToggleActive }: {
  inactiveUsers: UserProfile[];
  loading: boolean;
  formatDate: (date: string) => string;
  getRelativeTime: (date: string) => string;
  onToggleActive: (user: UserProfile) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading inactive users...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role
              </th>
              <th className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Created
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inactiveUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition">
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    {user.parties && (
                      <div className="text-xs text-gray-400 mt-1">{user.parties.name}</div>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      user.user_roles?.role_name === 'Admin'
                        ? 'bg-blue-100 text-blue-800'
                        : user.user_roles?.role_name === 'Retailer'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.user_roles?.role_name || 'Unknown'}
                  </span>
                </td>
                <td className="hidden md:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  {user.last_login_at ? (
                    <div>
                      <div className="text-sm text-gray-900">{formatDate(user.last_login_at)}</div>
                      <div className="text-xs text-orange-600">{getRelativeTime(user.last_login_at)}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Never</div>
                  )}
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                  <div className="text-xs text-gray-500">{getRelativeTime(user.created_at)}</div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onToggleActive(user)}
                    className={`transition p-1 rounded ${
                      user.is_active 
                        ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                        : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                    }`}
                    title={user.is_active ? 'Deactivate user' : 'Activate user'}
                  >
                    {user.is_active ? (
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    role_id: user.role_id || '',
    party_id: user.party_id || '',
    can_order_individual_sizes: user.can_order_individual_sizes ?? false,
  });
  const [parties, setParties] = useState<Party[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadParties();
    loadRoles();
  }, []);

  const loadParties = async () => {
    try {
      const data = await api.fetchParties();
      setParties(data.parties);
    } catch (err) {
      console.error('Failed to load parties:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.getRoles();
      setRoles(data.roles);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const selectedRole = roles.find(r => r.id === formData.role_id);
      await api.updateUser(user.id, {
        full_name: formData.full_name,
        role_id: formData.role_id,
        can_order_individual_sizes: formData.can_order_individual_sizes,
        ...(selectedRole?.role_name === 'Retailer' && { party_id: formData.party_id })
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 lg:p-8 max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Edit User</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => {
                const selectedRole = roles.find(r => r.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  role_id: e.target.value,
                  party_id: selectedRole?.role_name === 'Retailer' ? formData.party_id : '' 
                });
              }}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {roles.find(r => r.id === formData.role_id)?.role_name === 'Retailer' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Party</label>
              <select
                value={formData.party_id}
                onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {roles.find(r => r.id === formData.role_id)?.role_name !== 'Admin' && (
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="can_order_individual_sizes"
                checked={formData.can_order_individual_sizes}
                onChange={(e) => setFormData({ ...formData, can_order_individual_sizes: e.target.checked })}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="can_order_individual_sizes" className="block text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                  Allow Individual Size Selection
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable this to allow the user to order individual sizes in addition to size sets when adding items to cart.
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-2 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_id: '',
    party_id: '',
    can_order_individual_sizes: false,
  });
  const [parties, setParties] = useState<Party[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadParties();
    loadRoles();
  }, []);

  const loadParties = async () => {
    try {
      const data = await api.fetchParties();
      setParties(data.parties);
    } catch (err) {
      console.error('Failed to load parties:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.getRoles();
      setRoles(data.roles);
      // Set default role to Retailer if available
      const retailerRole = data.roles.find(r => r.role_name === 'Retailer');
      if (retailerRole && !formData.role_id) {
        setFormData(prev => ({ ...prev, role_id: retailerRole.id }));
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.createUser(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 lg:p-8 max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Create New User</h2>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., john_doe"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Role</label>
            <select
              value={formData.role_id}
              onChange={(e) => {
                const selectedRole = roles.find(r => r.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  role_id: e.target.value,
                  party_id: selectedRole?.role_name === 'Retailer' ? formData.party_id : '' 
                });
              }}
              required
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {roles.find(r => r.id === formData.role_id)?.role_name === 'Retailer' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Party *</label>
              <select
                value={formData.party_id}
                onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {roles.find(r => r.id === formData.role_id)?.role_name !== 'Admin' && (
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="create_can_order_individual_sizes"
                checked={formData.can_order_individual_sizes}
                onChange={(e) => setFormData({ ...formData, can_order_individual_sizes: e.target.checked })}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor="create_can_order_individual_sizes" className="block text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                  Allow Individual Size Selection
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable this to allow the user to order individual sizes in addition to size sets when adding items to cart.
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-2 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
