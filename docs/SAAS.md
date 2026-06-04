# SaaS mode

Multi-tenant API with per-organization API keys, usage limits, and isolated conversion history.

## Enable

```env
SAAS_ENABLED=true
SAAS_REQUIRE_API_KEY=false   # true for public API-only access
DATABASE_URL=postgresql://...
SAAS_ADMIN_SECRET=your-secret   # for POST /api/v1/saas/tenants
```

On first startup with an empty `tenants` table, a default tenant is created. If `SAAS_BOOTSTRAP_API_KEY` is empty, the generated key is printed once in API logs.

## Plans

| Plan | Monthly conversions | Max source size |
|------|---------------------|-----------------|
| free | 30 | 512 KB |
| pro | 500 | 2 MB |
| enterprise | unlimited | unlimited |

## Authentication

Send on every request:

```http
X-API-Key: cmk_xxxxxxxx
```

Or `Authorization: Bearer cmk_xxxxxxxx`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/saas/me` | Tenant + usage (requires auth context) |
| POST | `/api/v1/saas/tenants` | Create tenant (header `X-Admin-Secret`) |

## UI

When `SAAS_ENABLED=true`, the header shows a **SaaS** button to save an API key and view monthly usage.
