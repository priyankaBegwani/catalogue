import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import auth from './routes/auth.js';
import storage from './routes/storage.js';
import users from './routes/users.js';
import designs from './routes/designs.js';
import cart from './routes/cart.js';
import wishlist from './routes/wishlist.js';
import parties from './routes/parties.js';
import transport from './routes/transport.js';
import locations from './routes/locations.js';
import orders from './routes/orders.js';
import admin from './routes/admin.js';
import brands from './routes/brands.js';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env?.FRONTEND_URL;
    if (!frontendUrl) return origin || '*';

    const allowedOrigins = frontendUrl.split(',').map(u => u.trim().replace(/\/+$/, ''));
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.route('/api/auth', auth);
app.route('/api/storage', storage);
app.route('/api/users', users);
app.route('/api/designs', designs);
app.route('/api/cart', cart);
app.route('/api/wishlist', wishlist);
app.route('/api/parties', parties);
app.route('/api/transport', transport);
app.route('/api/locations', locations);
app.route('/api/orders', orders);
app.route('/api/admin', admin);
app.route('/api/brands', brands);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: err.message || 'Internal Server Error'
  }, err.statusCode || 500);
});

export default app;
