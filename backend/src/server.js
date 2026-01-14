import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Backend server running on port ${config.port}`);
});
