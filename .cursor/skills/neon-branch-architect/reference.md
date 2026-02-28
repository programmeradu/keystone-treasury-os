# Neon Branch Architect — Reference

## Neon API Base

- Base URL: `https://console.neon.tech/api/v2`
- Auth: `Authorization: Bearer {NEON_API_KEY}` (from env, never hardcoded)
- Docs: https://api-docs.neon.tech/reference/getting-started-with-neon-api

## Create Branch

```http
POST /projects/{project_id}/branches
Content-Type: application/json

{
  "branch": {
    "name": "studio-{session_id}",
    "parent_id": "{main_branch_id}"
  }
}
```

Response includes `id`, `name`, `host`, `connection_uris` (with credentials). Use the primary connection URI for migrations and queries.

## Delete Branch

```http
DELETE /projects/{project_id}/branches/{branch_id}
```

Returns 200 on success. Branch and its data are permanently removed.

## List Branches (optional)

```http
GET /projects/{project_id}/branches
```

Use to find `main` branch ID for `parent_id`, or to audit orphaned branches.

## SIWS JWT Verification

Before any Neon operation, decode and validate the SIWS JWT:

```ts
// Pseudocode - adapt to your SIWS library
const payload = decodeJWT(siwsToken);
if (!payload?.wallet_address) {
  throw new Error("SIWS JWT must contain wallet_address claim");
}
// Proceed with Neon API call
```

## Branch Lifecycle Summary

| Event              | Action                          |
|--------------------|---------------------------------|
| User enters Architect Mode | Create branch, run migrations |
| AI test run        | Use branch connection string   |
| Session end        | DELETE branch                  |
| Arweave commit     | DELETE branch                  |
