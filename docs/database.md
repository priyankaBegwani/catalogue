# Database

## Core Tables

### user_profiles

Purpose:
Extended user information.

Fields:
- id
- email
- role
- created_at

Roles:
- admin
- retailer

---

### categories

Purpose:
Product categorization.

Examples:
- Kurta
- Sherwani
- Jackets

Fields:
- id
- name
- slug
- image

---

### products

Purpose:
Main catalog entity.

Fields:
- id
- category_id
- name
- description
- images
- created_at

---

### product_variants

Purpose:
Variant-level inventory.

Fields:
- id
- product_id
- size
- color
- stock
- sku

---

# Relationships

categories → products → product_variants

---

# Important Constraints

- Products may contain many images
- Variants may scale heavily
- Queries must remain optimized
- Mobile loading performance matters

---

# Query Rules

- avoid N+1 queries
- paginate large datasets
- select only required columns
- avoid oversized payloads