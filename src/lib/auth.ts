import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account }) {
      console.log("[auth] signIn event — user:", user?.email, "provider:", account?.provider);
    },
  },
  providers: [
    GoogleProvider({
      clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
    }),
    CredentialsProvider({
      name: "credentials",
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

        // Only block accounts explicitly suspended
        if (user.isActive === false) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan as string,
          role: user.role as string,
        };
      },
    }),
  ],
  callbacks: {
    // JWT callback — runs in Edge context, NO Prisma calls here
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: store user data from authorize() into the token
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan ?? "FREE";
        token.role = (user as { role?: string }).role ?? "TEACHER";
        token.school = (user as { school?: string | null }).school ?? null;
      }
      return token;
    },

    // Session callback — runs in Node.js context, safe to use Prisma
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;

        // Refresh plan/role/school from DB on every session read
        // This ensures subscription changes are reflected immediately
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { plan: true, role: true, isActive: true, school: true },
          });

          if (dbUser && dbUser.isActive !== false) {
            session.user.plan = dbUser.plan as string;
            session.user.role = dbUser.role as string;
            session.user.school = dbUser.school ?? null;
          } else {
            // Suspended or deleted user
            session.user.plan = "FREE";
            session.user.role = "TEACHER";
            session.user.school = null;
          }
        } catch {
          // Fallback to token values if DB is unavailable
          session.user.plan = (token.plan as string) ?? "FREE";
          session.user.role = (token.role as string) ?? "TEACHER";
          session.user.school = (token.school as string | null) ?? null;
        }
      }
      return session;
    },
  },
});
