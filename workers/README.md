# Catalogue Worker - Cloudflare Workers Backend

This is a Cloudflare Workers-compatible version of the catalogue backend, converted from Express.js to use the Hono framework.

## Features

- ✅ **Cloudflare Workers Compatible** - Runs on the edge with global distribution
- ✅ **Hono Framework** - Fast, lightweight web framework for Workers
- ✅ **R2 Storage** - Native R2 bindings for image storage (no AWS SDK needed)
- ✅ **Supabase Integration** - Full database and authentication support
- ✅ **All Routes Preserved** - Complete API compatibility with Express backend
- ✅ **FormData Support** - Native file upload handling (no multer)
- ✅ **Environment Bindings** - Uses Workers env instead of process.env

## Project Structure

```
workers/
├── src/
│   ├── routes/          # API route handlers
│   │   ├── auth.js      # Authentication endpoints
│   │   ├── storage.js   # File upload/download
│   │   ├── designs.js   # Design management
│   │   ├── users.js     # User management
│   │   ├── cart.js      # Shopping cart
│   │   ├── wishlist.js  # Wishlist
│   │   ├── orders.js    # Order management
│   │   ├── parties.js   # Party management
│   │   ├── transport.js # Transport options
│   │   ├── locations.js # Location management
│   │   ├── admin.js     # Admin operations
│   │   └── brands.js    # Brand management
│   ├── middleware/      # Middleware functions
│   │   ├── auth.js      # Authentication middleware
│   │   └── errorHandler.js # Error handling
│   ├── lib/
│   │   └── r2.js        # R2 storage operations
│   ├── config.js        # Configuration helpers
│   └── index.js         # Main entry point
├── wrangler.toml        # Wrangler configuration
├── package.json         # Dependencies
└── .dev.vars.example    # Environment variables template

```

## Setup

### 1. Install Dependencies

```bash
cd workers
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file (copy from `.dev.vars.example`):

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_role_key
R2_PUBLIC_URL=https://pub-your-hash.r2.dev
```

### 3. Configure R2 Bucket

Update `wrangler.toml` with your R2 bucket name:

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"  # Change this
```

### 4. Set Secrets (Production)

For production deployment, set secrets using Wrangler CLI:

```bash
wrangler secret put VITE_SUPABASE_SERVICE_KEY
wrangler secret put R2_PUBLIC_URL
```

## Development

Start the development server:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

## Deployment

### Deploy to Production

```bash
npm run deploy
```

### Deploy to Staging

```bash
wrangler deploy --env dev
```

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-reset-token` - Verify reset token

### Storage
- `POST /api/storage/upload` - Upload file to R2
- `DELETE /api/storage/delete` - Delete file from R2
- `POST /api/storage/signed-url` - Get signed URL
- `POST /api/storage/signed-urls-batch` - Batch signed URLs

### Designs
- `GET /api/designs` - List designs
- `GET /api/designs/:id` - Get design
- `POST /api/designs` - Create design (admin)
- `PUT /api/designs/:id` - Update design (admin)
- `DELETE /api/designs/:id` - Delete design (admin)
- `GET /api/designs/categories` - List categories
- `GET /api/designs/styles` - List styles
- `GET /api/designs/fabric-types` - List fabric types

### Users
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin)
- `PATCH /api/users/:id/toggle-active` - Toggle active status (admin)
- `POST /api/users/:id/change-password` - Change password

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart
- `DELETE /api/cart` - Clear cart

### Wishlist
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:id` - Remove from wishlist

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update status (admin)
- `DELETE /api/orders/:id` - Delete order (admin)

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/categories` - Manage categories
- `GET /api/admin/styles` - Manage styles
- `GET /api/admin/fabric-types` - Manage fabric types

### Brands
- `GET /api/brands` - List brands
- `GET /api/brands/:id` - Get brand
- `POST /api/brands` - Create brand (admin)
- `PUT /api/brands/:id` - Update brand (admin)
- `DELETE /api/brands/:id` - Delete brand (admin)

## Key Differences from Express Backend

### 1. **Request/Response Handling**
- **Express**: `req.body`, `res.json()`
- **Hono**: `await c.req.json()`, `c.json()`

### 2. **File Uploads**
- **Express**: Uses `multer` middleware
- **Hono**: Native `FormData` API
  ```javascript
  const formData = await c.req.formData();
  const file = formData.get('file');
  const buffer = await file.arrayBuffer();
  ```

### 3. **Environment Variables**
- **Express**: `process.env.VAR_NAME`
- **Hono**: `c.env.VAR_NAME` (from context)

### 4. **R2 Storage**
- **Express**: AWS SDK with S3 client
- **Hono**: Native R2 bindings
  ```javascript
  await c.env.R2_BUCKET.put(key, buffer);
  ```

### 5. **Middleware**
- **Express**: `app.use(middleware)`
- **Hono**: Middleware as route handlers
  ```javascript
  router.get('/path', authenticateUser, async (c) => {})
  ```

### 6. **Context Access**
- **Express**: `req.user`, `req.profile`
- **Hono**: `c.get('user')`, `c.get('profile')`

## Performance Benefits

- **Global Edge Network** - Runs on Cloudflare's edge network
- **Zero Cold Starts** - Workers start instantly
- **Auto Scaling** - Handles traffic spikes automatically
- **Lower Latency** - Closer to users worldwide
- **Cost Effective** - Pay per request, no idle costs

## Monitoring

View logs in real-time:

```bash
npm run tail
```

Or use the Cloudflare Dashboard for detailed analytics.

## Troubleshooting

### R2 Bucket Access Issues
Ensure your R2 bucket binding is correctly configured in `wrangler.toml` and the bucket exists.

### Supabase Connection Issues
Verify your Supabase credentials in `.dev.vars` and that the service key has proper permissions.

### CORS Issues
CORS is enabled by default. Adjust in `src/index.js` if needed.

## Migration from Express

The Express backend in `/backend` remains unchanged. You can:

1. **Run both in parallel** - Use Workers for production, Express for local dev
2. **Gradual migration** - Move routes one at a time
3. **Full switch** - Deploy Workers and deprecate Express

## License

Same as the main project.
