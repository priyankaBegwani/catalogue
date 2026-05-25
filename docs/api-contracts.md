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
# API Rules

- validate all input
- return proper HTTP status codes
- never expose stack traces
- sanitize upload data
- keep responses consistent