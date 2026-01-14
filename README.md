# Ethnic Wear E-commerce Platform

A full-stack e-commerce application for ethnic men's wear with separate frontend (React) and backend (Node.js) using Supabase for database and authentication.

## Project Structure

```
project/
├── frontend/          # React + TypeScript + Vite frontend
├── backend/           # Node.js + Express backend
└── README.md
```

## Features

- **Two User Types**: Admin and Retailer
- **Authentication**: Secure login system using Supabase Auth
- **Admin Dashboard**: Create and manage retailer users
- **Product Catalogue**: Browse ethnic wear by categories
- **Product Variants**: Multiple sizes and colors for each product
- **Responsive Design**: Beautiful UI with Tailwind CSS

## Default Admin Credentials

```
Email: admin@ethnicwear.com
Password: Admin@123
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Database Schema

The application uses the following tables:
- **user_profiles**: Extended user information with roles
- **categories**: Product categories (Kurta, Sherwani, etc.)
- **products**: Main product information
- **product_variants**: Size and color variations

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### User Management (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user

### Products
- `GET /api/products/categories` - List categories
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details

## Technologies Used

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- Supabase Client

### Backend
- Node.js
- Express
- Supabase (Database & Auth)
- CORS

## Sample Data

The database is pre-seeded with:
- 1 Admin user
- 5 Product categories
- 10 Products across different categories
- 38 Product variants with different sizes and colors
