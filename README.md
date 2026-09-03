# Law by Grace

A calm, professional legal e-library and study platform. Courses, books, PDFs,
videos and articles — organised by area of law and free to study.

## Stack

- **Next.js 15 (App Router)** on Vercel
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

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Turso database |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_REGION` | Cloudflare R2 storage |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Session signing |

## Database

The Turso database is shared with an unrelated project. Law by Grace only ever
reads and writes tables prefixed `law_by_grace_`. Run the idempotent migration
to (re)create the Law by Grace data model:

```bash
npx tsx scripts/turso-db.mts inspect   # read-only report
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