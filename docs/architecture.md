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
├── features/
├── services/
├── hooks/
├── contexts/
├── utils/
├── types/
└── routes/
```

Rules:
- feature-first organization preferred
- shared UI inside components/ui
- business logic belongs in services/hooks
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
├── controllers/
├── services/
├── middleware/
├── validators/
├── utils/
├── ai/
├── storage/
└── config/
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
- AWS S3

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