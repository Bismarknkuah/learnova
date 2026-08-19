# Multi-tenancy — schools renting Learnova

Learnova is built so any school can sign up and run its own branded space, with its data
isolated from every other school.

## How a school joins
`POST /api/v1/auth/register-school` (public) — or the **Register a school** tab on `/register`.
It creates a school **tenant** with a unique slug (its subdomain, e.g. `accra-high.learnova.app`)
and the first **school_admin**, then signs that admin in. The admin can then invite teachers,
students and parents, all scoped to their school.

## Two isolation modes (set `TENANT_ISOLATION`)

### `shared` (default)
Every school lives in one database; every document carries a `tenantId` and all queries are
scoped to it. Simple, cheap, and fully working today. Recommended to start.

### `database` (database-per-tenant)
Every school gets its **own MongoDB database** (e.g. `learnova_accra-high`). This gives the
strongest isolation: a school's data is physically separate, independently backup-able, and
trivially exportable. Enable with:

```
TENANT_ISOLATION=database
MONGO_BASE_URI=mongodb+srv://user:pass@cluster0.xxximongodb.net   # cluster, no db name
TENANT_DB_PREFIX=learnova_
ROOT_DOMAIN=learnova.app
```

The connection manager (`backend/src/core/tenantDb.ts`) resolves each school to its database,
opening and caching a dedicated Mongoose connection on first use. The **tenant registry**
(the list of schools) always lives in the primary database — it is the control plane.

> Migration note: in `database` mode the data-plane repositories resolve their models from the
> request's tenant connection. The auth/registry path and the connection manager are wired;
> remaining feature modules are migrated to `getTenantConnection(slug)` using the same pattern
> as the rest of the codebase. `shared` mode needs no migration and is production-grade on its own.

## Resolving the school per request
`resolveTenantSlug(host, header)` detects the school from the subdomain
(`accra-high.learnova.app`) or an `X-Tenant-Slug` header, so the frontend doesn't hard-code a tenant.
