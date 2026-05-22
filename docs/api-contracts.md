# API Contracts

Base route:

```txt
/api
```

---

# Response Format

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Error:

```json
{
  "success": false,
  "message": "Error message"
}
```

---

# Authentication Routes

## POST /api/auth/login

Purpose:
Authenticate user.

---

## POST /api/auth/logout

Purpose:
Logout user.

---

## GET /api/auth/me

Purpose:
Get authenticated user.

---

# User Routes

## GET /api/users

Admin only.

---

## POST /api/users

Admin only.

---

## PATCH /api/users/:id

Admin only.

---

# Product Routes

## GET /api/products

Supports:
- pagination
- filtering
- category filtering

---

## GET /api/products/:id

Returns:
- product
- variants
- category

---

## GET /api/products/categories

Returns category list.

---

# API Rules

- validate all input
- return proper HTTP status codes
- never expose stack traces
- sanitize upload data
- keep responses consistent