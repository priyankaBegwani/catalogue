# Backend Guidelines

## Express Standards

- routes stay thin
- services contain business logic
- middleware handles auth/validation
- centralize error handling

---

# Validation

Always validate:
- request body
- params
- query params
- uploads

---

# Upload Rules

Using:
- Multer
- AWS S3

Rules:
- validate MIME type
- validate file size
- generate safe filenames
- avoid local file storage

---

# Security

Always:
- use Helmet
- enable rate limiting
- sanitize inputs
- validate auth

Never:
- expose secrets
- trust client validation

---

# Performance

- reuse initialized clients
- avoid blocking operations
- compress responses
- paginate large datasets

---

# Error Handling

Use centralized middleware.

Never expose:
- stack traces
- secrets
- internal implementation details