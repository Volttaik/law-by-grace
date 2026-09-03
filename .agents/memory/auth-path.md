---
name: Auth file path
description: Where auth.ts lives and why, to avoid broken @/auth imports
---

NextAuth v5 config lives at `mantra/src/auth.ts` (not `mantra/auth.ts`).

**Why:** `tsconfig.json` sets `"@/*": ["./src/*"]`, so `@/auth` resolves to `src/auth.ts`. Middleware at `src/middleware.ts` and all API routes import `{ auth }` from `@/auth`. A root-level `mantra/auth.ts` is unreachable via this alias.

**How to apply:** Any new API route or server component needing the session should import `import { auth } from "@/auth"`. Client components use `useSession()` from `next-auth/react` (wrapped by `SessionProvider` in `src/app/layout.tsx`).
