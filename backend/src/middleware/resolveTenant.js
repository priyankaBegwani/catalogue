import { supabaseAdmin } from '../config.js';
import { cache } from '../utils/cache.js';
import { resolveTenantByHost } from '../services/tenantService.js';

export const resolveTenant = async (req, res, next) => {
  try {
    // 1. Explicit header (API clients / server-to-server)
    const explicitId = req.headers['x-tenant-id'];
    if (explicitId) {
      req.tenantId = explicitId;
      return next();
    }

    // 2. ?tenant=slug query param — used when the API is on a separate domain
    //    from the frontend (e.g. catalogue-be.onrender.com) and there is no
    //    subdomain to infer the tenant from. Safe: authenticated routes still
    //    verify the user belongs to the resolved tenant.
    if (req.query.tenant) {
      const slug = req.query.tenant;
      const cacheKey = `tenant_slug:${slug}`;
      let tenantId = cache.get(cacheKey);
      if (!tenantId) {
        const { data } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          tenantId = data.id;
          cache.set(cacheKey, tenantId, 300);
        }
      }
      if (tenantId) {
        req.tenantId = tenantId;
        return next();
      }
    }

    // 3. Host-based resolution (subdomain or custom domain)
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';
    const cacheKey = `tenant_host:${host}`;

    let tenantId = cache.get(cacheKey);
    if (!tenantId) {
      tenantId = await resolveTenantByHost(host);
      if (tenantId) cache.set(cacheKey, tenantId, 300);
    }

    if (!tenantId) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    req.tenantId = tenantId;
    next();
  } catch (err) {
    next(err);
  }
};
