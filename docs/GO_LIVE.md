# Go-Live Runbook

A practical, ordered checklist to take Learnova from this repo to a running production
deployment. It assumes the managed-service setup in `DEPLOYMENT.md`.

## 0. Before you start
This codebase is a verified, runnable foundation: the backend typechecks, has a passing
unit-test suite (`npm --workspace @learnova/backend run test`), graceful shutdown, and
health/readiness probes. It is **not** a fully-hardened 30-feature product — see
`FEATURES.md` for exactly what is ✅ working, 🟡 partial, and ⬜ not built. Deploy the
✅ slice first; ship the rest incrementally.

## 1. Provision infrastructure
- [ ] MongoDB Atlas cluster + least-privilege user + IP allowlist + automated backups.
- [ ] Managed Redis (Upstash or similar).
- [ ] Qdrant Cloud (or a small VM) for AI Twin vectors.
- [ ] Object storage (S3/R2) bucket for recordings + uploads.
- [ ] LiveKit Cloud (or self-hosted) for live classrooms; note URL + API key/secret.
- [ ] CDN (Cloudflare) in front of web + storage.

## 2. Secrets (never commit these)
- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random, rotated.
- [ ] `MONGO_URI`, `REDIS_URL`, `QDRANT_URL` (+ key).
- [ ] `PAYSTACK_SECRET_KEY` / public key; MoMo credentials.
- [ ] `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- [ ] `ANTHROPIC_API_KEY` (LLM); `DEEPGRAM_API_KEY` + `ASR_PROVIDER=deepgram` (transcription).
- [ ] Put them in your platform's secret manager; the API validates required vars at boot.

## 3. Swap dev-grade internals for production
The app runs in dev-fallback mode for these until configured — address before real traffic:
- [ ] **Event bus** → back `core/eventBus.ts` with Redis Streams (interface is already stable).
- [ ] **Embeddings** → replace the hash-embedding in `ai/llm.ts` with a real embeddings API,
      and point `ai/ragStore.ts` at Qdrant instead of the in-memory map.
- [ ] **Payments** → wire the MoMo provider fully; register Paystack webhook URL.
- [ ] **Recording storage** → configure LiveKit Egress output to your bucket; set the
      webhook that writes `recording.url` back onto the session.

## 4. Build + deploy
- [ ] CI green (typecheck + tests + builds) — see `.github/workflows/ci.yml`.
- [ ] Build images: `docker build -f backend/Dockerfile .` and `-f frontend/Dockerfile .`.
- [ ] Push to your registry; deploy with `docker-compose.prod.yml` or your orchestrator.
- [ ] Confirm `/health` (liveness) and `/ready` (readiness) both return 200.
- [ ] Run `npm --workspace @learnova/backend run seed` against staging only.

## 5. Mobile (iOS + Android)
- [ ] Set `EXPO_PUBLIC_API_URL` to the production API.
- [ ] `eas build` for iOS + Android; submit to App Store / Play Console.

## 6. Pre-traffic hardening (do not skip)
- [ ] Tighten rate limits on auth + search.
- [ ] Parental-consent flow verified for minors (Ghana Data Protection Act, Act 843).
- [ ] Add request tracing (OpenTelemetry) + a metrics/alerting backend.
- [ ] Load-test the booking→payment→classroom path.
- [ ] Expand the test suite toward the routes/services you depend on most.
- [ ] Restore-from-backup tested at least once.

## 7. What "done" means honestly
After steps 1–6 you have a production-ready **core**: register → AI-ranked tutor → book →
pay → live class (recorded) → AI notes/replay → AI Twin study → adaptive plan → marketplace
→ gamification, on web + mobile. The 🟡/⬜ features in `FEATURES.md` (virtual labs, on-device
proctoring, offline sync, on-chain anchoring, full national-exam AI generation) are scheduled
build-outs, each following the same module pattern — ship them in the order in `ROADMAP.md`.
