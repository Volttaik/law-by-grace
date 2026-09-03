import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = user.id;
        (token as any).username = (user as any).username;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) (session.user as any).id = String(token.id);
      (session.user as any).username = String((token as any).username ?? "");
      (session.user as any).role = String((token as any).role ?? "STUDENT");
      return session;
    },
  },
};
