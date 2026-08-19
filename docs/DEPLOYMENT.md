# Deployment

## Environments
- **dev** — `docker compose up` (Mongo, Redis, Qdrant, API, Web on your machine).
- **staging / prod** — container images deployed to a host or orchestrator.

## Quick production bring-up (single host)
```bash
cp .env.example .env        # fill in real secrets
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
This runs 2 replicas each of API and Web, keeps Mongo/Redis internal (no public ports),
and applies restart + resource policies.

## Recommended managed setup (realistic for a Ghana-based team)
| Concern | Recommendation |
|---|---|
| Database | MongoDB Atlas (managed, backups, scaling) |
| Cache / bus | Upstash Redis or managed Redis |
| Vector DB | Qdrant Cloud (or self-host on a small VM) |
| API + Web | Render, Railway, or Fly.io to start; move hot services to a k8s cluster at scale |
| Object storage | Cloudflare R2 / AWS S3 (recordings, uploads) — cheap egress matters |
| CDN | Cloudflare in front of everything (critical for low-bandwidth reach) |
| Secrets | Platform secret manager; never commit `.env` |

## Pipeline (see `.github/workflows/ci.yml`)
1. Install → build shared → typecheck API → agent smoke test → build web.
2. On `main`: build API + Web Docker images, push to your registry, deploy.

## Scaling path
- API is a modular monolith — scale horizontally behind a load balancer first.
- Split out the heaviest modules (video/SFU, AI inference, proctoring) into their own
  services when load demands; the event bus already decouples them.
- Swap the in-memory event bus for Redis Streams, then Kafka, without touching callers.
- Add OpenTelemetry tracing + a metrics backend (Grafana/Prometheus) before you need it.

## Pre-launch checklist
- [ ] Real JWT secrets, rotated.
- [ ] Paystack + MoMo live keys; webhook URLs registered and signature-verified.
- [ ] Mongo Atlas IP allowlist + least-privilege DB user.
- [ ] Backups enabled and a restore tested.
- [ ] Rate limits tuned for auth/search.
- [ ] Parental-consent flow live for minors (Act 843).
- [ ] CDN + HTTPS everywhere.
