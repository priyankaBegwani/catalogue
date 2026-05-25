# CLAUDE.md

## Project Overview

This is a full-stack ethnic wear catalog, retailer management and order management platform.

Tech stack:

Frontend:
- React 18
- TypeScript
- Vite
- TailwindCSS
- Supabase Client

Backend:
- Node.js
- Express.js
- Supabase
- OpenAI SDK

Storage
Cloudflare R2

CDN
Cloudflare

Primary users:
- Admins
- Retailers
- Wholesale catalog managers
- staff
- sales
- guests

---

# Critical Product Goals

Prioritize:

1. Fast catalog browsing
2. Mobile-first UX
3. Reliable image handling
4. Large catalog scalability
5. Retailer-friendly workflows
6. WhatsApp sharing compatibility
7. Low-friction admin management

---

# Operational Rules

Before making changes:

1. Read surrounding files first
2. Reuse existing patterns
3. Avoid introducing new dependencies unnecessarily
4. Keep modifications minimal and targeted
5. Prefer extending existing abstractions
6. Never rewrite unrelated code
7. Preserve backward compatibility when possible

---

# Architecture Rules

## Frontend

- Feature-first architecture
- Reusable UI components
- Keep components focused
- Prefer local state
- Use Context only for app-level concerns

## Backend

Use pattern:

Route → Controller → Service → Database/API

Rules:
- Keep routes thin
- Business logic belongs in services
- Validate all inputs
- Centralize error handling

---

# Technical Constraints

- Product grids may scale to thousands of products
- PDFs may contain large catalogs
- Users often use low-end Android devices
- Optimize for mobile bandwidth
- Avoid heavy frontend dependencies

---

# Security Rules

Never:
- expose service role keys
- trust frontend validation
- commit secrets
- bypass authorization checks

Always:
- validate input
- sanitize uploads
- validate MIME types
- enforce auth at backend layer

---

# TypeScript Rules

- Never use `any` unless unavoidable
- Prefer `type` over `interface`
- Use explicit return types in shared utilities
- Keep types colocated with features when possible

---

# Styling Rules

- Tailwind utilities first
- Mobile-first responsive design
- Avoid inline styles
- Maintain consistent spacing
- Prefer clean minimal UI

---

# Performance Rules

Frontend:
- avoid unnecessary re-renders
- lazy load heavy routes
- optimize large grids
- memoize only when beneficial

Backend:
- avoid blocking operations
- compress responses
- optimize Supabase queries
- reuse initialized clients

---

# Important Docs

Read these before major changes:

- docs/business-context.md
- docs/architecture.md
- docs/database.md
- docs/api-contracts.md
- docs/frontend-guidelines.md
- docs/backend-guidelines.md
- docs/ai-workflow.md

---

# Never Introduce Without Approval

- Redux
- GraphQL
- styled-components
- ORM layers
- large UI frameworks
- unnecessary abstractions

---

# Coding Philosophy

Prioritize:
- readability
- maintainability
- scalability
- developer experience
- performance

Avoid:
- overengineering
- premature abstraction
- deeply nested logic
- giant components/files

---

# Final Rule

Every change should improve at least one of:

- readability
- maintainability
- scalability
- security
- performance
- user experience