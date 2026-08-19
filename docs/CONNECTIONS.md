# How everything connects

Four packages, one contract. Nothing talks to anything else except through the shared types
and the versioned HTTP API.

```
                    ┌─────────────────────────────┐
                    │   packages/shared           │
                    │   types · DTOs · endpoints  │   ← single source of truth
                    └─────────────┬───────────────┘
            imports ▲             │ imports             ▲ imports
                    │             │                     │
   ┌────────────────┴───┐  ┌──────┴───────┐   ┌─────────┴──────────┐
   │  frontend (Next.js)│  │ mobile  │   │  backend (Express) │
   │  React Query +     │  │ (Expo RN,    │   │  validates against  │
   │  fetch client      │  │ iOS+Android) │   │  the same DTOs      │
   └─────────┬──────────┘  └──────┬───────┘   └─────────┬──────────┘
             │   HTTPS  /api/v1   │                     │
             └─────────┬──────────┘                     │
                       ▼                                 ▼
                ┌──────────────────────────────────────────┐
                │  Learnova API  (modules · agents · bus)    │
                │  MongoDB · Redis · Qdrant · Paystack/MoMo  │
                └──────────────────────────────────────────┘
```

## The contract (`packages/shared`)
- `endpoints` — every route path, used verbatim by web and mobile so a renamed route is a
  compile error in the clients, not a 404 at runtime.
- DTOs (`LoginDto`, `SessionDto`, `AskDto`, `BookingDto`, …) — request/response shapes shared
  by clients and validated by the API's Zod schemas.
- Domain types (`Role`, `BookingStatus`, `TutorSummary`, …).

Change a DTO once → web, mobile, and the API all see it.

## Auth flow (identical on web + mobile)
1. Client `POST`s `endpoints.auth.login` with a `LoginDto`.
2. API returns a `SessionDto` (user + access + refresh tokens).
3. **Web** stores it in a persisted Zustand store (localStorage); **mobile** stores it in the
   device secure keychain/keystore via `expo-secure-store`.
4. Every request sends `Authorization: Bearer <accessToken>`; the API's `requireAuth`
   middleware verifies it and attaches `{ id, role, tenantId }`.

## API client parity
| | Web | Mobile |
|---|---|---|
| Transport | `fetch` (`src/lib/api.ts`) | `fetch` (`src/lib/api.ts`) |
| Base URL | `NEXT_PUBLIC_API_URL` | `EXPO_PUBLIC_API_URL` / `app.json` extra |
| Token store | Zustand + localStorage | Zustand + SecureStore |
| Data layer | TanStack Query | TanStack Query |
| Envelope | `ApiResponse<T>` from shared | `ApiResponse<T>` from shared |

Both clients hit the same `/api/v1/...` surface and unwrap the same `{ success, data, error }`
envelope. A feature added to the API is immediately reachable from both — just call the
endpoint with the shared DTO.

## Running all three together
```bash
docker compose up --build        # API :4000 (+ Mongo/Redis/Qdrant), Web :3000
npm --workspace @learnova/backend run seed
# mobile (separate, needs Expo toolchain):
cd mobile && EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:4000 npx expo start
```
On a phone, point `EXPO_PUBLIC_API_URL` at your machine's LAN IP (not `localhost`) so the
device can reach the API.
