/**
 * Invitations routes
 *
 * Authenticated (admin):
 *   GET    /api/invitations              — list invites for this tenant
 *   POST   /api/invitations              — create invite, returns shareable link
 *   POST   /api/invitations/:id/resend   — regenerate token + extend expiry
 *   DELETE /api/invitations/:id          — cancel invitation
 *
 * Public (no auth required):
 *   GET  /api/invitations/accept/:token  — validate token, return preview
 *   POST /api/invitations/accept/:token  — accept invite, create account
 */
import express from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function inviteUrl(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/invite/${token}`;
}

// ── Authenticated routes ──────────────────────────────────────────────────────

router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false });
  res.json({ success: true, data: data ?? [] });
});

router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { email, name, role_name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });

    const token     = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString(); // 7 days

    // Upsert — re-invite the same email by updating the record
    const { data, error } = await supabaseAdmin
      .from('invitations')
      .upsert(
        {
          tenant_id:  req.tenantId,
          invited_by: req.profile?.id ?? null,
          email:      email.toLowerCase().trim(),
          name:       name?.trim() || null,
          role_name:  role_name ?? 'Staff',
          token,
          status:     'pending',
          expires_at: expiresAt,
        },
        { onConflict: 'tenant_id,email' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: { ...data, invite_url: inviteUrl(data.token) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/resend', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const token     = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .update({ token, expires_at: expiresAt, status: 'pending' })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: { ...data, invite_url: inviteUrl(data.token) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  res.json({ success: true });
});

// ── Public routes (no auth) ───────────────────────────────────────────────────

// Validate token — returns safe preview info
router.get('/accept/:token', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('invitations')
      .select('email, name, role_name, tenant_id, tenants(name, slug)')
      .eq('token', req.params.token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!data) {
      return res.status(404).json({ success: false, message: 'This invite link is invalid or has expired.' });
    }

    res.json({
      success: true,
      data: {
        email:         data.email,
        name:          data.name,
        role_name:     data.role_name,
        business_name: data.tenants?.name ?? null,
        tenant_slug:   data.tenants?.slug ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Accept invite — creates the user account
router.post('/accept/:token', async (req, res) => {
  try {
    const { full_name, password } = req.body;
    if (!full_name || !password) {
      return res.status(400).json({ success: false, message: 'full_name and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Re-validate token (includes expiry + status)
    const { data: invite } = await supabaseAdmin
      .from('invitations')
      .select('*, tenants(id, slug)')
      .eq('token', req.params.token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!invite) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite link.' });
    }

    const tenantId = invite.tenant_id;

    // Resolve the role for this tenant
    const { data: role } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role_name', invite.role_name)
      .maybeSingle();

    if (!role) {
      return res.status(400).json({ success: false, message: `Role "${invite.role_name}" not found for this tenant.` });
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         invite.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        tenant_id: tenantId,
        role_id:   role.id,
      },
      app_metadata: { tenant_id: tenantId },
    });

    if (authError) {
      return res.status(500).json({ success: false, message: authError.message });
    }

    // Update auto-created profile
    await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name,
        role_id:   role.id,
        tenant_id: tenantId,
        is_active: true,
      })
      .eq('id', authData.user.id);

    // Mark invite accepted
    await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    res.json({ success: true, message: 'Account created. You can now log in.' });
  } catch (err) {
    console.error('Invite accept error:', err);
    res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
  }
});

export default router;
