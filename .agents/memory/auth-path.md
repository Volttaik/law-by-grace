---
name: Auth file path
description: Where auth.ts lives and why, to avoid broken @/auth imports
---

NextAuth v5 config lives at `src/auth.ts` (project root of Law by Grace).

**Why:** `tsconfig.json` sets `"@/*": ["./src/*"]`, so `@/auth` resolves to `src/auth.ts`. Middleware at `src/middleware.ts` and all API routes import `{ auth }` from `@/auth`.

**How to apply:** Any new API route or server component needing the session should import `import { auth } from "@/auth"`. Client components use `useSession()` from `next-auth/react` (wrapped by `SessionProvider` in `src/app/layout.tsx`).
