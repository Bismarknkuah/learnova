# Learnova — Enterprise Monorepo

AI-powered educational super-platform for West Africa. TypeScript end to end: a layered
Express API, MongoDB schemas, a Next.js website, an Expo **iOS + Android** app, a multi-agent
core, and full Docker + deployment setup. All three clients share one type+endpoint contract
(`shared`) and one API — see `docs/CONNECTIONS.md`. Honest feature status in
`docs/FEATURES.md`.

```
learnova/
├── apps/
│   ├── api/                     # Express + TypeScript backend (layered, modular)
│   └── src/
│   │       ├── config/          # validated env config
│   │       ├── core/            # db, redis, logger, errors, http, eventBus
│   │       ├── middleware/      # auth, rbac, tenant, validate, rateLimit, errorHandler
│   │       ├── modules/         # one folder per domain (see pattern below)
│   │       │   ├── auth/        ├── tutors/     ├── bookings/   ├── payments/
│   │       │   ├── users/       ├── tenants/    ├── classrooms/ ├── assignments/
│   │       │   ├── exams/       ├── certificates/ ├── notifications/ └── ai/
│   │       ├── agents/          # multi-agent system (Supervisor + specialists)
│   │       ├── ai/              # LLM gateway + RAG store (AI Twin)
│   │       ├── app.ts · server.ts · routes.ts · index.ts · seed.ts
│   ├── web/                     # Next.js (App Router) + Tailwind + React Query
│   └── mobile/                  # Expo React Native — iOS + Android (expo-router)
│       └── src/{app,components,features,lib,hooks,stores,styles}
├── packages/
│   └── shared/                  # types shared by api + web (single-sourced contract)
├── docs/                        # ARCHITECTURE.md · ROADMAP.md · DEPLOYMENT.md
├── docker-compose.yml · docker-compose.prod.yml
├── .github/workflows/ci.yml · Makefile · .env.example
```

## Run it

```bash
npm install
npm run typecheck                         # API compiles clean (verified)
npm --workspace @learnova/backend run demo     # multi-agent system, no DB/keys needed

# full stack
cp .env.example .env
docker compose up --build                  # api :4000 · web :3000 · mongo/redis/qdrant
npm --workspace @learnova/backend run seed      # demo tenant + tutor + student
```

Seeded logins: `mensah@learnova.dev` (teacher) / `ama@learnova.dev` (student) — `password123`.

## The module pattern (how to add a feature)

Every domain module follows the same layered shape, so adding one is mechanical. Copy an
existing module (e.g. `tutors/`) and rename:

```
modules/<name>/
├── <name>.model.ts        # Mongoose schema + inferred TS types (tenant-scoped)
├── <name>.repository.ts   # ONLY place that queries the DB; injects tenantId everywhere
├── <name>.service.ts      # business logic; emits domain events; calls agents/other services
├── <name>.validation.ts   # Zod schemas for body/query/params
├── <name>.controller.ts   # thin request→service→response handlers
└── <name>.routes.ts       # Express router: auth, rbac, validate, then handlers
```
Then mount it in `src/routes.ts`. That's the whole contract.

The layering rule: **routes → controller → service → repository → model.** Controllers never
touch the DB; services never touch `req`/`res`; repositories enforce tenant isolation.

### Fully implemented (reference modules)
`auth`, `tutors`, `bookings`, `payments` — end to end, including the event-sourced ledger,
Paystack/MoMo, AI ranking, and conflict guards. **Use these as your templates.**

### Schemas + routes scaffolded (extend using the pattern)
`users`, `tenants`, `classrooms`/sessions, `assignments`, `exams`+attempts, `certificates`,
`notifications` — models are production-shaped; flesh out service/repository as you build.

## Multi-agent core
`agents/` holds a Supervisor that routes goals to specialist agents (Tutor/AI-Twin,
Recommendation, Scheduling, Finance) over a shared event bus. The API calls it via
`agentSystem.supervisor.route(capability, task)` and `…handle(goal)`. See `docs/ARCHITECTURE.md`.

## What to read next
- `docs/ARCHITECTURE.md` — full system design + advanced/enterprise features.
- `docs/ROADMAP.md` — phased build order (ship in weeks, not years).
- `docs/GO_LIVE.md` — ordered go-live checklist.
- `docs/DEPLOYMENT.md` — environments, managed-service picks, scaling path, launch checklist.
