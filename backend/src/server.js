import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';
import { globalErrorHandler } from './utils/errorHandler.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import designsRoutes from './routes/designs.js';
import storageRoutes from './routes/storage.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import partyRoutes from './routes/parties.js';
import transportRoutes from './routes/transport.js';
import locationRoutes from './routes/locations.js';
import ordersRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Security and performance middleware
app.use(cors());
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Serve static files from uploads directory (for local storage)
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`Serving static files from: ${uploadsPath}`);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/designs', designsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

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
