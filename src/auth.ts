import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        if (user.bannedAt) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        if (!user.isVerified) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          image: user.image,
          role: user.role,
        } as any;
      },
    }),
  ],
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
});
