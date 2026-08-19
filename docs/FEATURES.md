# Feature Status — the honest map

This is a straight accounting of where every feature from the vision actually stands in the
codebase. Three states:

- ✅ **Working** — implemented end to end, persisted, wired into routes/agents. Usable now.
  (Some have a dev-grade dependency noted that needs a production swap — e.g. embeddings.)
- 🟡 **Scaffolded** — schema and/or stub exists and follows the project pattern; needs its
  service/integration built out. Clear, bounded work.
- ⬜ **Designed only** — described in `ARCHITECTURE.md`, no code yet. Larger efforts.

| # | Feature | State | Notes / what "done" needs |
|---|---|---|---|
| — | Auth, multi-tenancy, RBAC, minor consent | ✅ | Production-shaped |
| 5 | Intelligent tutor matching | ✅ | DB search + AI re-ranking |
| 6 | Smart scheduling agent | ✅ | Conflict-free slot solver |
| — | Booking flow | ✅ | Double-booking guard, price calc |
| — | Payments + commission + ledger | ✅ | Paystack live-ready; MoMo provider is a stub to wire |
| 1 | AI Twin Tutor | ✅ | RAG + cited answers. Prod needs real embeddings API + Qdrant (dev uses a hash-embedding) |
| 2 | Personal AI Learning Companion | ✅ | Via TutorAgent |
| 15 | AI Assignment Workspace | ✅ | Submit → AI review (score/feedback/hints/plagiarism signal) |
| 30 | Multi-agent architecture | ✅ | Supervisor + Tutor/Recommendation/Scheduling/Finance/Assessment over event bus |
| — | Event-driven notifications | ✅ | In-app; email/SMS/push fan-out is a TODO in the service |
| 18 | School Owner Portal | ✅ | Create tenant/campus, roster, stats. Fees/timetables/results = build-out |
| 19 | Parent Portal | ✅ | Link child + view children. Grades/fees views build on existing data |
| 20 | Multi-campus | ✅ | Campuses on tenant; per-campus scoping is the next layer |
| 16 | Proctored exams | ✅ | Attempts + auto-grade + risk scoring; per-concept results feed the adaptive engine. On-device ML still optional |
| 26 | National exam prep (BECE/WASSCE/…) | 🟡 | Exam tracks + attempts + auto-grade. AI full-paper generation still to add |
| 17 | Blockchain certificates | 🟡 | Issue (sha256) + public QR verify work; on-chain anchoring is a stub job |
| 7 | Live classroom (HD video) | ✅ | LiveKit rooms + real access tokens + recording egress + frontend room UI. Run a LiveKit server to go live |
| 11 | AI Class Assistant | ✅ | On recording-ready: transcribe→summary→key-moments→notes (ASR provider is a pluggable stub) |
| 3 | Adaptive learning engine | ✅ | Bayesian Knowledge Tracing per concept; auto-updates from exams; recommendations + frontend study plan |
| 4 | AI Career Mentor | ✅ | `/career/guidance`: LLM maps interests/skills → careers, universities, scholarships, certs |
| 8 | AI whiteboard recognition | ⬜ | Needs handwriting/equation model |
| 9 / 10 | Engagement + chat system | 🟡 | Basic chat/hand-raise/polls via Socket.IO; threads/voice notes/files to add |
| 12/13 | Auto-notes / session replay | ✅ | Replay endpoint with summary, key-moment chapters, and bookmarks |
| 14 | Virtual laboratories | ⬜ | Large; start with one sim (e.g. logic circuits) |
| 21 | Marketplace (courses/e-books) | ✅ | Products, search, purchase via payment flow, buyer library + gated downloads |
| 22 | Community / forums | ✅ | Groups (club/study/research/forum) + threaded posts |
| 23 | Gamification (XP/badges/streaks) | ✅ | XP/coins/badges via event consumers + leaderboard |
| 24 | Research collaboration hub | 🟡 | Covered partly by community 'research' groups; dedicated tools to add |
| 25 | Scholarship marketplace | ✅ | Listings (scholarship/grant/fellowship/internship) with deadlines |
| 27 / 28 | Offline / low-bandwidth | ⬜ | PWA offline sync + audio-only/adaptive streaming |
| 29 | Digital library | ✅ | Resource catalog (e-books/journals/notes/recordings), search + add |

## How to read this
The ✅ rows are a genuinely working core: a student can register, find an AI-ranked tutor,
book and pay (commission split to an event-sourced ledger), study with a teacher's AI Twin,
submit an assignment and get AI feedback, sit an auto-graded exam, and a school admin/parent
can manage and monitor — across web **and** mobile, sharing one API and one type contract.

The 🟡 and ⬜ rows are real engineering, not a weekend. Each ⬜ module is roughly the size of
one ✅ module you can already see (copy `modules/tutors`, follow the layered pattern). The
heavy ones — live video SFU, virtual labs, on-device proctoring, offline sync — are each a
multi-week focused effort. `ROADMAP.md` sequences them so you ship value continuously instead
of waiting for everything.

I can build any of these out next, in priority order.
