# Frontend Architecture Documentation

## Project Structure

```
frontend/src/
├── pages/              # Main application pages (route components)
│   ├── index.ts       # Barrel export for all pages
│   ├── Dashboard.tsx
│   ├── Catalogue.tsx
│   ├── DesignManagement.tsx
│   ├── Orders.tsx
│   ├── PartyEntry.tsx
│   ├── TransportEntry.tsx
│   ├── UserManagement.tsx
│   ├── ProfilePage.tsx
│   ├── Login.tsx
│   └── Setup.tsx
│
├── components/         # Reusable UI components
│   ├── index.ts       # Barrel export for all components
│   ├── Sidebar.tsx    # Main navigation sidebar
│   ├── TopBar.tsx     # Top navigation bar
│   ├── Navbar.tsx     # Legacy navbar (deprecated)
│   ├── AddDesignModal.tsx
│   ├── ViewDesignModal.tsx
│   ├── CartModal.tsx
│   ├── CheckoutModal.tsx
│   ├── OrderDetails.tsx
│   └── Wishlist.tsx
│
├── contexts/           # React Context providers
│   └── AuthContext.tsx
│
├── lib/               # Utilities and API clients
│   └── api.ts
│
├── icons/             # Custom icon components
│
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Code Organization Principles

### 1. **Pages vs Components**

**Pages** (`src/pages/`)
- Main route components that represent full application views
- Typically map 1:1 with routes in App.tsx
- Can import and compose multiple components
- Handle page-level state and data fetching
- Examples: Dashboard, Catalogue, Orders

**Components** (`src/components/`)
- Reusable UI elements used across multiple pages
- Modals, forms, navigation elements
- Should be as generic and reusable as possible
- Examples: Sidebar, TopBar, Modals

### 2. **Import Strategy**

Use barrel exports (index.ts) for cleaner imports:

```typescript
// ✅ Good - Using barrel exports
import { Dashboard, Catalogue, Orders } from './pages';
import { Sidebar, TopBar, CartModal } from './components';

// ❌ Avoid - Direct imports
import Dashboard from './pages/Dashboard';
import { Sidebar } from './components/Sidebar';
```

### 3. **Component Naming Conventions**

- **PascalCase** for component files: `Dashboard.tsx`, `UserManagement.tsx`
- **Named exports** for most components: `export function Dashboard() {}`
- **Default exports** for legacy components (gradually migrate to named)
- **Descriptive names** that clearly indicate purpose

### 4. **State Management**

- **Local state** (useState) for component-specific UI state
- **Context** (React Context) for shared application state (auth, theme)
- **Props** for parent-child communication
- **Custom hooks** for reusable stateful logic (future enhancement)

### 5. **File Organization Best Practices**

Each page/component should follow this structure:
```typescript
// 1. External imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal imports - components
import { Sidebar, TopBar } from '../components';

// 3. Internal imports - utilities
import { api } from '../lib/api';

// 4. Type definitions
interface ComponentProps {
  // ...
}

// 5. Component definition
export function ComponentName() {
  // State declarations
  // Effects
  // Event handlers
  // Render
}
```

## Layout Architecture

### Current Layout System

The application uses a **Sidebar + TopBar** layout:

```
┌─────────────────────────────────────────────┐
│              TopBar (80px)                  │
│  [Menu] [Logo Center] [Wishlist Cart User] │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │      Main Content Area          │
│ (280px)  │      (Pages render here)        │
│          │                                  │
│ Pinnable │      Responsive padding         │
│ Collapse │      based on sidebar state     │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

**Key Features:**
- Sidebar can be pinned (desktop) or collapsed
- TopBar is always visible with essential actions
- Main content area adjusts padding when sidebar is pinned
- Responsive design for mobile and desktop

## Routing Structure

Routes are defined in `App.tsx`:

```typescript
<Routes>
  <Route path="/" element={<Navigate to={isAdmin ? '/dashboard' : '/catalogue'} />} />
  <Route path="/dashboard" element={isAdmin ? <Dashboard /> : <Navigate to="/catalogue" />} />
  <Route path="/catalogue" element={<Catalogue />} />
  <Route path="/designs" element={<DesignManagement />} />
  <Route path="/users" element={<UserManagement />} />
  <Route path="/parties" element={<PartyEntry />} />
  <Route path="/transport" element={<TransportEntry />} />
  <Route path="/orders" element={<Orders />} />
  <Route path="/profile" element={<ProfilePage />} />
</Routes>
```

## Best Practices

### ✅ Do's

1. **Use barrel exports** for cleaner imports
2. **Keep components focused** - single responsibility principle
3. **Extract reusable logic** into custom hooks
4. **Use TypeScript** interfaces for props and state
5. **Follow consistent naming** conventions
6. **Add comments** for complex logic
7. **Handle loading and error states** in all data-fetching components
8. **Use semantic HTML** elements
9. **Implement responsive design** with Tailwind utilities
10. **Keep files under 500 lines** - split if larger

### ❌ Don'ts

1. Don't mix page logic with component logic
2. Don't create circular dependencies
3. Don't hardcode values - use constants
4. Don't ignore TypeScript errors
5. Don't duplicate code - extract to shared utilities
6. Don't forget to clean up effects (useEffect cleanup)
7. Don't use inline styles - prefer Tailwind classes
8. Don't commit commented-out code

## Migration Notes

### Recent Changes

1. **Moved pages to dedicated folder**
   - All main route components moved from `components/` to `pages/`
   - Created barrel exports for cleaner imports

2. **Implemented new layout system**
   - Replaced top navbar with Sidebar + TopBar
   - Added pin/collapse functionality
   - Improved mobile responsiveness

3. **Enhanced Dashboard**
   - Modern gradient design
   - Draggable/resizable widgets
   - Admin-only access

### Deprecated Components

- `Navbar.tsx` - Replaced by Sidebar + TopBar (kept for reference)

## Future Enhancements

1. **Custom Hooks**
   - Extract data fetching logic to `useOrders`, `useDesigns`, etc.
   - Create `useAuth` improvements for better type safety

2. **Component Library**
   - Build reusable UI components (Button, Input, Card, etc.)
   - Create a design system with consistent styling

3. **State Management**
   - Consider Zustand or Redux for complex state
   - Implement optimistic updates for better UX

4. **Performance**
   - Implement code splitting with React.lazy
   - Add memoization where needed
   - Optimize re-renders

5. **Testing**
   - Add unit tests for components
   - Integration tests for pages
   - E2E tests for critical flows

## Contributing

When adding new features:

1. Determine if it's a **page** or **component**
2. Place in appropriate folder
3. Add to barrel export (index.ts)
4. Follow existing patterns and conventions
5. Update this documentation if adding new patterns
