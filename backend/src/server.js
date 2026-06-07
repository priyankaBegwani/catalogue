import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { globalErrorHandler } from './utils/errorHandler.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import designsRoutes from './routes/designs.js';
import storageRoutes from './routes/storage.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import partyRoutes from './routes/parties.js';
import partyPhoneNumbersRoutes from './routes/party-phone-numbers.js';
import transportRoutes from './routes/transport.js';
import locationRoutes from './routes/locations.js';
import ordersRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import brandsRoutes from './routes/brands.js';
import whatsappRoutes from './routes/whatsappWebhook.js';
import rolesRoutes from './routes/roles.js';
import userPartyAssociationsRoutes from './routes/user-party-associations.js';
import analyticsRoutes from './routes/analytics.js';
import { resolveTenant } from './middleware/resolveTenant.js';
import { checkSubscription } from './middleware/checkSubscription.js';
import platformRoutes from './routes/platform.js';
import tenantRoutes from './routes/tenant.js';
import exportRoutes from './routes/export.js';
import subscriptionBillingRoutes, { razorpayWebhookHandler } from './routes/subscriptionBilling.js';
import onboardingRoutes from './routes/onboarding.js';
import invitationsRoutes from './routes/invitations.js';
import imageRestructureRoutes from './routes/internal/imageRestructure.js';
import designCompletionRoutes from './routes/internal/designCompletion.js';
import assistanceRequestsRoutes from './routes/internal/assistanceRequests.js';
import exportDataRoutes from './routes/internal/exportData.js';
import importPipelineRoutes from './routes/internal/importPipeline.js';

const app = express();

// Security and performance middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      // No FRONTEND_URL set — allow all origins (dev / misconfigured prod)
      return callback(null, true);
    }

    // Support comma-separated list of allowed origins
    const allowed = (frontendUrl || '').split(',').map(u => u.trim().replace(/\/+$/, ''));
    const marketingUrl = (process.env.MARKETING_URL || '').trim().replace(/\/+$/, '');
    if (marketingUrl) allowed.push(marketingUrl);

    if (allowed.includes(origin)) return callback(null, true);

    // Allow any subdomain of whollio.com (marketing site)
    if (/^https?:\/\/([a-z0-9-]+\.)*whollio\.com$/.test(origin)) return callback(null, true);

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

app.get('/health', (req, res) => {
   res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    service: 'backend-api'
  });
});
// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

const platformLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }); // 10 registrations/hour per IP

// Tenant middleware
app.use('/api', (req, res, next) => {
  // Skip platform/global/superadmin-internal routes
  if (
    req.path.startsWith('/auth') ||
    req.path.startsWith('/platform') ||
    req.path.startsWith('/invitations/accept') ||
    req.path.startsWith('/internal') ||
    req.path.startsWith('/onboarding/preview')
  ) {
    return next();
  }

  return resolveTenant(req, res, next);
});

app.use('/api', (req, res, next) => {
  if (
    req.path.startsWith('/auth') ||
    req.path.startsWith('/platform') ||
    req.path.startsWith('/invitations/accept') ||
    req.path.startsWith('/internal') ||
    req.path.startsWith('/onboarding/preview')
  ) {
    return next();
  }
  return checkSubscription(req, res, next);
});

app.use('/api/platform', platformLimiter, platformRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/designs', designsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/party-phone-numbers', partyPhoneNumbersRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/user-party-associations', userPartyAssociationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/subscription', subscriptionBillingRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/invitations', invitationsRoutes);
// Internal superadmin tools — bypass tenant + subscription middleware (enforced per-route via requireSuperAdmin)
app.use('/api/internal/image-restructure', imageRestructureRoutes);
app.use('/api/internal/design-completion', designCompletionRoutes);
app.use('/api/internal/assistance',        assistanceRequestsRoutes);
app.use('/api/internal/export',            exportDataRoutes);
app.use('/api/internal/import',            importPipelineRoutes);

// Public onboarding preview (token-based, no auth) — must bypass resolveTenant + checkSubscription
// These are already handled inside the onboarding router via the /preview/* paths
app.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhookHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

const server = app.listen(config.port, () => {
  console.log(`🚀 Backend server running on port ${config.port}`);
  console.log(`📦 Storage type: ${config.storageType}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Bulk API available: POST /api/designs/bulk (max 500 designs/batch)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
