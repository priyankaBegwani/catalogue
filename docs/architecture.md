# Architecture

## Repository Structure

```txt
frontend/
backend/
supabase/
docs/
```

---

# Frontend Architecture

Structure:

```txt
src/
├── components/
├── pages/
├── config/
├── icons/
├── hooks/
├── contexts/
├── utils/
├── types/
└── lib/
```

Rules:
- feature-first organization preferred
- shared UI inside components
- avoid massive pages/components

---

# Backend Architecture

Pattern:

```txt
Route → Controller → Service → Database/API
```

Recommended structure:

```txt
src/
├── routes/
├── config/
├── utils/
├── middleware/

```

---

# Database

Source of truth:
- Supabase PostgreSQL

Rules:
- keep queries centralized
- avoid duplicated query logic
- use RLS where possible
- validate permissions server-side

---

# Storage

Primary asset storage:
- cloudflare r2

Rules:
- prefer presigned URLs
- keep buckets private
- validate uploads

---

# Authentication

Handled using:
- Supabase Auth

Rules:
- backend must verify authorization
- frontend auth alone is insufficient

---

# AI Integration

Uses:
- OpenAI SDK

Rules:
- modular prompts
- reusable AI services
- validate AI outputs
- never trust generated content blindly