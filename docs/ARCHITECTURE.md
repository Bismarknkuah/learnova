# Learnova — Enterprise Architecture

> An AI-powered educational super-platform for West Africa, built on a multi-agent core.

This document describes the target architecture: how every feature in the vision doc
fits together, plus the advanced/enterprise capabilities added on top. It is intentionally
opinionated. The companion `ROADMAP.md` explains the order in which to build it.

---

## 1. Design principles

1. **Modular monolith first, microservices later.** Twenty microservices on day one is how
   small teams drown. Build clean module boundaries inside one deployable, then split the
   hot modules (video, AI inference, proctoring) out when load demands it. The code is
   structured so a module becomes a service by moving a folder.
2. **Event-driven core.** Agents and modules communicate through an event bus, never by
   reaching into each other's database. This is what makes the multi-agent system real
   rather than a pile of function calls.
3. **Multi-tenant by default.** Every row is scoped to a `tenantId` (a school, or the
   "public marketplace" tenant). Isolation is enforced at the data-access layer, not by hope.
4. **Africa-first non-functionals.** Offline-first, low-bandwidth, mobile-money, local
   languages, and intermittent connectivity are treated as core requirements, not add-ons.
5. **Privacy & minors by design.** Most users are students, many are minors. PII handling,
   consent, and the Ghana Data Protection Act (Act 843) shape the schema, not a later audit.

---

## 2. System layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                               │
│  Web (Next.js PWA) · Mobile (React Native) · School Admin · Parent App │
└───────────────┬──────────────────────────────────────────────────────┘
                │  HTTPS / WSS
┌───────────────▼──────────────────────────────────────────────────────┐
│  EDGE                                                                  │
│  API Gateway · Rate limiting · WAF · CDN (lessons, recordings)         │
└───────────────┬──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│  APPLICATION (modular monolith)                                        │
│                                                                        │
│  Identity & Tenancy │ Booking & Scheduling │ Payments (MoMo/Paystack)  │
│  Classroom (WebRTC)  │ Marketplace          │ School / Parent portals   │
│  Assessment & Exams  │ Content & Library     │ Certificates (blockchain) │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  AGENT ORCHESTRATION LAYER  (the differentiator)                  │ │
│  │  Supervisor → Tutor · Recommendation · Scheduling · Assessment ·  │ │
│  │  Exam/Proctor · Career · Fraud · Finance · Analytics · School ·   │ │
│  │  Parent · Research agents                                         │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────┬───────────────┬──────────────────┬───────────────┬────────────┘
        │               │                  │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────────▼────────┐ ┌────▼──────────┐
│ EVENT BUS    │ │ JOB QUEUE   │ │ AI / INFERENCE   │ │ REALTIME       │
│ Redis Streams│ │ BullMQ      │ │ LLM + RAG + ASR  │ │ Socket.IO/CRDT │
│ (→ Kafka)    │ │ (async work)│ │ + embeddings     │ │ WebRTC SFU      │
└──────────────┘ └─────────────┘ └──────────────────┘ └────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────────┐
│  DATA                                                                  │
│  MongoDB (operational) · Redis (cache/sessions) · Vector DB (Qdrant)   │
│  Object store (S3-compatible: recordings, uploads) · OLAP (analytics)  │
│  Blockchain anchor (certificate hashes)                                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. The multi-agent system (your biggest advantage)

This is the heart of the platform and your Multi-Agent Systems coursework made real.

### Pattern: Supervisor + specialized workers over a shared event bus

- A **Supervisor (Router) Agent** receives a goal ("help this student prepare for WASSCE
  Physics") and decomposes it, delegating to specialist agents.
- Each specialist agent is **autonomous**: it has its own tools, its own slice of context,
  and subscribes to bus events relevant to it.
- Agents communicate via **typed events** on the bus, not direct calls. This gives you the
  classic MAS properties — autonomy, loose coupling, emergent coordination — and makes the
  system observable and testable.

### Agent registry

| Agent | Responsibility | Key tools |
|---|---|---|
| **Supervisor** | Goal decomposition, routing, conflict resolution | LLM planner, agent registry |
| **Tutor** | Teaching, Q&A, the AI Twin of a real teacher | RAG over teacher's lessons, LLM |
| **Recommendation** | Suggest tutors / classes / materials | Hybrid recommender (content + collaborative) |
| **Scheduling** | Build conflict-free timetables across timezones | Constraint solver, calendar |
| **Assessment** | Grade assignments, give feedback | Rubric engine, plagiarism check |
| **Exam/Proctor** | Generate exams, monitor integrity | Item generator, anomaly detector |
| **Career** | Career, university, scholarship guidance | Profile model, knowledge base |
| **Fraud** | Detect cheating, payment fraud, fake accounts | Risk scoring engine |
| **Finance** | Payments, payouts, commission, reconciliation | Paystack/MoMo, ledger |
| **Analytics** | Reports, learning insights, dashboards | OLAP queries |
| **School** | Multi-campus admin automation | Tenant admin APIs |
| **Parent** | Alerts, progress digests | Notification fan-out |
| **Research** | Research collaboration, lit support | Doc search, RAG |

### AI Twin Tutor pipeline (flagship feature)

```
Teacher records lessons / uploads notes
        │
        ▼
 Transcription (ASR) ──► Chunking ──► Embeddings ──► Vector DB (per-teacher namespace)
        │                                                        │
        ▼                                                        ▼
 Style profile (tone, examples, pace)              Student question
        │                                                        │
        └──────────────► Tutor Agent (RAG) ◄─────────────────────┘
                              │
                              ▼
        Answer "in Prof. Mensah's voice", grounded in the teacher's
        own material, with citations back to the source lesson.
```

The teacher's content lives in an **isolated vector namespace** so one teacher's AI Twin
can never leak another's material — and so a teacher can revoke/retrain their twin at will.

---

## 4. Advanced & enterprise features added on top

These go beyond the original 30 to make it genuinely enterprise-grade:

- **Event-sourced ledger for money.** Every payment, payout, and commission is an immutable
  event. Balances are derived. This is non-negotiable for trust and reconciliation.
- **Idempotent payments** with webhook signature verification (Paystack/MoMo retry a lot).
- **Knowledge tracing for adaptive learning.** Model each student's mastery per concept
  (Bayesian Knowledge Tracing → later a Deep Knowledge Tracing model). The Adaptive Engine
  recommends the next best activity from estimated mastery, not just quiz averages.
- **CRDT-based collaborative whiteboard** (Yjs) so the smart whiteboard syncs without
  conflicts even on flaky connections — directly serves your low-bandwidth requirement.
- **Offline-first sync engine.** PWA + local store + a sync protocol with conflict
  resolution, so rural students genuinely learn offline and reconcile when back online.
- **Privacy-preserving proctoring.** Run face/gaze/tab-switch detection on-device where
  possible; send risk *signals* not raw video. Cheaper, more private, works on low bandwidth.
- **RBAC + ABAC authorization** with full audit logging (who saw which minor's grades, when).
- **Observability stack:** OpenTelemetry tracing, structured logs, metrics, per-agent traces
  so you can literally watch the agents collaborate.
- **Feature flags** to roll the 30 features out progressively and per-tenant.
- **Localization** for Twi, Ewe, Ga, Hausa, and French — first-class, not bolted on.
- **Fraud/risk engine** scoring sessions, payments, and exam attempts in real time.
- **Data warehouse** feeding the Analytics Agent (don't run heavy reports on the live DB).
- **Blockchain certificate anchoring:** store the credential hash on-chain (cheap), keep the
  document off-chain; verify via QR → hash lookup. No need to put PII on a public ledger.

---

## 5. Technology choices (and why)

| Concern | Choice | Note |
|---|---|---|
| Backend | Node.js + Express (TypeScript later) | Matches your stack; huge talent pool in GH |
| Data | MongoDB Atlas + Mongoose | Flexible schema for fast iteration |
| Cache/sessions/bus | Redis (Streams for the bus) | One dependency, many jobs; swap to Kafka at scale |
| Jobs | BullMQ | Transcription, embeddings, emails, payouts |
| Vector | Qdrant (self-host) or Pinecone | Per-teacher namespaces for AI Twins |
| Realtime | Socket.IO + WebRTC SFU (LiveKit/MediaSoup) | SFU, not mesh — survives African bandwidth |
| LLM | Provider-agnostic gateway | Don't hard-couple to one vendor |
| Payments | Paystack + MoMo (MTN/Telecel/AirtelTigo) | Mobile money is the market |
| Auth | JWT + OAuth + Ghana Card verification | Ghana Card for tutor KYC/trust |
| Frontend | Next.js + Tailwind (PWA) + React Native | Web PWA does double duty as low-end mobile |

---

## 6. Data model (core collections)

`tenants` · `users` · `profiles` (student/teacher/parent/admin) · `courses` · `classrooms`
· `sessions` · `bookings` · `payments` · `ledger_entries` · `ratings` · `messages`
· `assignments` · `submissions` · `exams` · `attempts` · `mastery` (knowledge tracing)
· `certificates` · `ai_twins` · `ai_conversations` · `study_materials` · `recordings`
· `notifications` · `audit_logs` · `risk_events`

Every collection except `tenants` carries `tenantId`. Soft-delete everything (`deletedAt`).

---

## 7. Security & compliance checklist

- Encrypt PII at rest; TLS everywhere.
- Parental consent flow for users under 18; minimised data collection for minors.
- Per-tenant data isolation enforced in the repository layer.
- Full audit trail on grade access, payments, and admin actions.
- Webhook signature verification on all payment callbacks.
- Rate limiting + bot protection on auth and search.
- Right-to-erasure support (Act 843).
