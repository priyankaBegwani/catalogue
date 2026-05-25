import { supabaseAdmin } from '../config.js';
import { cache } from '../utils/cache.js';

export const checkFeature = (featureKey) => async (req, res, next) => {
  try {
    const cacheKey = `tenant_features:${req.tenantId}`;
    let features = cache.get(cacheKey);

    if (!features) {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('subscription_status, trial_ends_at, plans(features)')
        .eq('id', req.tenantId)
        .single();

      const isActive = data?.subscription_status === 'active' ||
        (data?.subscription_status === 'trial' && new Date(data.trial_ends_at) > new Date());

      features = { ...(data?.plans?.features ?? {}), _active: isActive };
      cache.set(cacheKey, features, 60);
    }

    if (!features._active) {
      return res.status(402).json({ success: false, message: 'Subscription inactive or trial expired' });
    }

    if (featureKey && !features[featureKey]) {
      return res.status(403).json({ success: false, message: `This feature requires a higher plan` });
    }

    next();
  } catch (err) {
    next(err);
  }
};
