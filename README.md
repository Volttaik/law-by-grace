# Law by Grace

A calm, professional legal e-library and study platform. Courses, books, PDFs,
videos and articles — organised by area of law and free to study.

## Stack

- **Next.js 14 (App Router)** on Vercel
- **Turso (libSQL)** via Prisma with `@prisma/adapter-libsql` — all Law by Grace
  tables live in the isolated `law_by_grace_*` namespace
- **Cloudflare R2** for media storage (PDFs, videos, documents, images, covers)
- **Resend** for transactional email (verification codes, password resets)
- **NextAuth (Auth.js)** sessions + credentials login
- Tailwind CSS with a layered blue/neutral design system (dark mode default)

## Local development

```bash
pnpm install
pnpm prisma generate
pnpm dev
```

Required environment variables (see `.env.example` if present; never commit `.env`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Yes | Turso (libSQL) database connection |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Yes* | Cloudflare R2 media storage (*required for uploads; the code degrades gracefully without it) |
| `R2_REGION` | No | R2 region; defaults to `auto` |
| `RESEND_API_KEY` | Yes* | Resend transactional email (*without it, codes are only logged in development) |
| `EMAIL_FROM` | Yes* | Sender address for Resend; `src/lib/email.ts` always displays it as “Law by Grace <address>” |
| `AUTH_SECRET` | Yes | NextAuth/Auth.js session-signing secret (server-side only) |
| `NEXTAUTH_URL` / `AUTH_URL` | No | Optional base-URL fallback for generated metadata links — must be the Law by Grace domain |
| `LAW_BY_GRACE_ADMIN_EMAIL` / `LAW_BY_GRACE_ADMIN_PASSWORD` / `LAW_BY_GRACE_ADMIN_NAME` | No | Bootstrap admin account for `pnpm db:admin` tooling only |

## Database

The Turso database is shared with an unrelated project. Law by Grace only ever
reads and writes tables prefixed `law_by_grace_`. Run the idempotent migration
to (re)create the Law by Grace data model:

```bash
npx tsx scripts/turso-db.mts inspect   # read-only report
npx tsx scripts/turso-db.mts verify    # read-only: live schema vs prisma/schema.prisma
npx tsx scripts/migrate-law-by-grace.mts  # safe, idempotent migration
npx tsx scripts/dev-seed.ts            # local dev seed (Grace admin + sample courses)
```

## Product areas

- **Library / Discover** — browse courses by area of law, search, saved courses
- **Courses** — course pages with modules and materials (PDF reader, video, documents)
- **Materials** — shareable per-material links that work on any deployment origin
- **Articles** — educational legal writing with drafts, editions and publishing
- **Admin** — server-authorized management of users, courses, materials and articles
- **Accounts** — signup with email verification, password reset, profiles, dark/light theme