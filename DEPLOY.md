# Learnova — Deployment Runbook

Stack: **MongoDB Atlas** (database) → **Railway** (backend API + Socket.IO) → **Vercel** (Next.js frontend).
The backend builds with **esbuild** (`npm run build` → `dist/index.js`), so it needs no large build memory.

---

## 0. Before you commit — ROTATE THE ATLAS PASSWORD ⚠️
The connection string that appeared in earlier screenshots is exposed. In Atlas → Database Access,
edit the `baristernkuah` user, set a **new password**, and use the new URI everywhere below.
Never commit a real `MONGO_URI` — only `.env.example` (placeholders) belongs in git.

---

## 1. MongoDB Atlas
1. Create a free M0 cluster.
2. Database Access → add a user (save the password).
3. Network Access → allow `0.0.0.0/0` (or Railway's egress IPs).
4. Copy the SRV URI: `mongodb+srv://<user>:<pass>@<cluster>/learnova?retryWrites=true&w=majority`

## 2. Push to GitHub
```
git init && git add . && git commit -m "Learnova"
git remote add origin <your-repo> && git push -u origin main
```
`.gitignore` already excludes `node_modules`, `.next`, `dist`, and `.env`.

## 3. Railway (backend)
1. New Project → Deploy from GitHub repo. Railway reads `railway.json`:
   - build: `npm install && shared build && backend build` (esbuild)
   - start: `npm --workspace @learnova/backend start` → `node dist/index.js`
   - healthcheck: `/health`
2. Variables (Settings → Variables):
   ```
   NODE_ENV=production
   PORT=4000
   MONGO_URI=<your Atlas URI>
   JWT_ACCESS_SECRET=<random 32+ chars>
   JWT_REFRESH_SECRET=<different random 32+ chars>
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=30d
   CORS_ORIGIN=https://<your-vercel-domain>   # fill after step 4, then redeploy
   TENANT_ISOLATION=shared
   # Optional (enable features):
   ANTHROPIC_API_KEY=        # all AI features (tutor, CV, interview, research, languages)
   PAYSTACK_SECRET_KEY=      # payments, payouts, subscriptions (Mobile Money)
   PAYSTACK_PUBLIC_KEY=
   GOOGLE_CLIENT_ID=         # Google sign-in
   ```
3. Deploy. Note the public URL, e.g. `https://learnova-api.up.railway.app`.
4. Seed once (Railway Shell): `npm run seed`

## 4. Vercel (frontend)
1. New Project → import the repo. **Root Directory = `frontend`** (vercel.json handles the workspace build).
2. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://<your-railway-api-url>
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same Google client ID>   # optional
   ```
3. Deploy. Copy the domain, e.g. `https://learnova.vercel.app`.

## 5. Close the loop
- Back in Railway, set `CORS_ORIGIN=https://learnova.vercel.app` and redeploy.
- Visit the Vercel URL and log in with a seeded account (e.g. `ama@learnova.dev` / `password123`).

---

## Feature → key matrix (what works without keys vs. with)
| Feature | No key | Needs |
|---|---|---|
| Auth, RBAC, **MFA (TOTP)** | ✅ works | — |
| Google sign-in | button explains setup | `GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| AI tutor / Twin / CV / interview / research / language tutor | template/extractive fallback | `ANTHROPIC_API_KEY` |
| Payments, tutor payouts, **subscriptions** | dev-activates | `PAYSTACK_SECRET_KEY` (+ Plans/webhook for auto-recurring) |
| Messaging, notifications, classrooms, labs, exams, analytics | ✅ works | — |
| Video (WebRTC P2P) | ✅ small classes | TURN server / LiveKit SFU for scale & strict NATs |

## Build commands (reference)
- Backend: `npm run build` (esbuild → `dist/index.js`) · type-safety: `npm run typecheck`
- Frontend: `npm --workspace @learnova/frontend run build` (Next.js)
- Tests: `npm --workspace @learnova/backend run test` (18 passing)

## Next: automatic recurring billing
Once the API is live with a public URL, recurring billing plugs in:
1. Create Paystack **Plans** (Pro ₵49, Premium ₵99) in the Paystack dashboard.
2. Subscribe via Paystack's plan code (charges recur automatically).
3. Add a webhook at `POST /api/v1/payments/webhooks/paystack` to handle
   `subscription.create`, `charge.success`, and `subscription.disable` events,
   updating the `Subscription` status/`currentPeriodEnd`.
The webhook needs the deployed HTTPS URL — which is why deployment comes first.
