# Frontend Guidelines

## React Rules

- functional components only
- avoid giant components
- extract reusable hooks
- keep JSX readable

---

# State Management

Use local state first.

Use Context only for:
- auth
- theme
- global app state

Avoid unnecessary global state.

---

# Styling

Use:
- TailwindCSS
- utility-first styling

Avoid:
- inline styles
- deeply nested class logic

---

# Performance

Important:
- optimize product grids
- lazy load heavy routes
- optimize image rendering
- reduce unnecessary renders

---

# Accessibility

Always support:
- keyboard navigation
- semantic HTML
- proper labels
- focus states

---

# File Naming

Components:
- ProductCard.tsx
- DashboardLayout.tsx

Hooks:
- useProducts.ts
- useAuth.ts