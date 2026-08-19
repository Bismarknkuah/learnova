# Learnova — Build Roadmap

The vision has ~30 features. Each is real work. This roadmap sequences them so you ship
something usable in weeks, earn revenue early, and add the dazzling features on a working base.

The ordering rule: **revenue-critical path first, differentiators second, breadth last.**

---

## Phase 0 — Foundations (Weeks 1–3)
*Goal: a deployable skeleton you can build on safely.*

- Repo, CI/CD, environments, secrets management.
- Identity & multi-tenancy: signup/login, roles (student, teacher, parent, school-admin), JWT.
- Core data models + the event bus + job queue wiring.
- Observability baseline (structured logs, health checks).

✅ The scaffold in this project gets you most of Phase 0.

## Phase 1 — Transact (Weeks 4–8)
*Goal: a tutor can list, a student can book and pay, money moves correctly.*

- Tutor profiles + intelligent search/matching (subject, price ₵, rating, language, availability).
- Booking + Smart Scheduling Agent (conflict-free, timezone-aware).
- Payments: Paystack + Mobile Money, **event-sourced ledger**, commission (10–20%), payouts.
- Ratings & reviews.

**This is your first revenue.** Everything before this is cost; this is the moment Learnova
is a business.

## Phase 2 — Teach (Weeks 9–14)
*Goal: classes actually happen on-platform.*

- Live classroom: WebRTC via an SFU (LiveKit/MediaSoup), screen share, recording.
- Smart whiteboard (start simple; add CRDT collaboration next).
- Classroom chat, hand-raise, polls, reactions.
- AI Class Assistant: attendance, recording, transcript, summary, revision notes.
- Session replay + auto-generated PDF notes.

## Phase 3 — The AI moat (Weeks 15–22)
*Goal: the features competitors can't copy quickly.*

- **AI Twin Tutor** (RAG over each teacher's lessons) — flagship.
- Personal AI Learning Companion (explain, summarize, quiz, flashcards, study plans).
- **Adaptive Learning Engine** with knowledge tracing.
- AI Assignment Workspace (review, hints, plagiarism) + AI Career Mentor.
- Full multi-agent orchestration online and observable.

✅ The agent layer in this scaffold is your Phase 3 foundation, started early on purpose.

## Phase 4 — Institutions (Weeks 23–30)
*Goal: sell to schools, not just individuals — the big contracts.*

- School Owner Portal (departments, courses, timetables, fees, results).
- Parent Portal (attendance, grades, fee payment, alerts, teacher chat).
- Multi-campus management.
- Proctored exams + National Exam Prep (BECE, WASSCE, GRE, SAT, IELTS, TOEFL).
- Blockchain certificates.

## Phase 5 — Reach & depth (Weeks 31+)
*Goal: serve all of West Africa and deepen each pillar.*

- Offline + low-bandwidth modes (offline-first sync, audio-only, adaptive streaming).
- Marketplace (recorded courses, e-books, past questions), Digital Library.
- Community, gamification, scholarship marketplace, research hub.
- Virtual laboratories (start with one — e.g. logic-circuit sim — then expand).
- Localization: Twi, Ewe, Ga, Hausa, French.

---

## Cross-cutting, every phase
Security & privacy (minors!), observability, accessibility, performance on cheap Android
phones and 3G. These are not a phase — they are a standard applied continuously.

## A note on team size
Solo or 2–3 people? Stop at Phase 2 as your launchable MVP, add **one** Phase-3 AI feature
as your wedge (the AI Twin), and only attempt Phase 4 once you have either revenue or funding.
Virtual labs (#14) and a full blockchain stack are tempting but are each multi-month efforts —
schedule them deliberately, never opportunistically.
