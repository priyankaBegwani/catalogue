import express from 'express';
import { supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  getOneOrFail
} from '../utils/index.js';

const router = express.Router();

// Get all roles
router.get('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const roles = await executeQuery(
      supabaseAdmin
        .from('user_roles')
        .select('*')
        .order('role_name', { ascending: true }),
      'Failed to fetch roles'
    );

    res.json({ roles });
  })
);

// Get single role
router.get('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Role ID');

    const role = await getOneOrFail(
      supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('id', id),
      'Role not found'
    );

    res.json({ role });
  })
);

// Create new role
router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { 
      role_name, 
      role_description,
      permissions
    } = req.body;

    validateRequired(req.body, ['role_name', 'permissions']);

    // Check if role name already exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('role_name', role_name)
      .single();

    if (existingRole) {
      throw new AppError('Role with this name already exists', 400);
    }

    const role = await executeQuery(
      supabaseAdmin
        .from('user_roles')
        .insert([
          {
            role_name,
            role_description: role_description || '',
            permissions,
            is_system_role: false
          }
        ])
        .select('*')
        .single(),
      'Failed to create role'
    );

    res.status(201).json({
      message: 'Role created successfully',
      role
    });
  })
);

// Update role
router.put('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      role_name, 
      role_description,
      permissions
    } = req.body;

    validateUUID(id, 'Role ID');
    validateRequired(req.body, ['role_name', 'permissions']);

    // Check if it's a system role
    const existingRole = await getOneOrFail(
      supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('id', id),
      'Role not found'
    );

    if (existingRole.is_system_role) {
      // For system roles, only allow updating permissions
      const role = await executeQuery(
        supabaseAdmin
          .from('user_roles')
          .update({
            permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single(),
        'Failed to update role'
      );

      return res.json({
        message: 'Role permissions updated successfully',
        role
      });
    }

    // For custom roles, allow full update
    const role = await executeQuery(
      supabaseAdmin
        .from('user_roles')
        .update({
          role_name,
          role_description: role_description || '',
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single(),
      'Failed to update role'
    );

    res.json({
      message: 'Role updated successfully',
      role
    });
  })
);

// Delete role
router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Role ID');

    // Check if it's a system role
    const role = await getOneOrFail(
      supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('id', id),
      'Role not found'
    );

    if (role.is_system_role) {
      throw new AppError('Cannot delete system roles', 400);
    }

    // Check if any users are assigned to this role
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name')
      .eq('role_id', id);

    if (users && users.length > 0) {
      throw new AppError(
        `Cannot delete role. ${users.length} user(s) are assigned to this role. Please reassign them first.`,
        400
      );
    }

    await executeQuery(
      supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('id', id),
      'Failed to delete role'
    );

    res.json({ message: 'Role deleted successfully' });
  })
);

export default router;
