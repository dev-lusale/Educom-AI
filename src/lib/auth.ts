import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const isProd = process.env.NODE_ENV === "production";

// Startup diagnostics — visible in Vercel function logs
console.log("[auth.ts] GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING");
console.log("[auth.ts] GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING");
console.log("[auth.ts] AUTH_SECRET:", process.env.AUTH_SECRET ? "SET" : "MISSING");
console.log("[auth.ts] DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 40));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  // Only enable debug in development — it causes noise and warns in production
  debug: !isProd,
  logger: {
    error: (code, ...message) => {
      // Log the full cause so the real error is visible in Vercel logs
      const cause = (message[0] as { cause?: unknown })?.cause;
      console.error("[nextauth:error]", code, JSON.stringify(message, null, 2));
      if (cause) {
        console.error("[nextauth:error:cause]", JSON.stringify(cause, Object.getOwnPropertyNames(cause as object)));
      }
    },
    warn: (code) => {
      if (!isProd) console.warn("[nextauth:warn]", code);
    },
    debug: (code, ...message) => {
      if (!isProd) console.log("[nextauth:debug]", code, ...message);
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          if (!user || !user.password) return null;
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
        } catch (err) {
          console.error("[auth] credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan ?? "FREE";
        token.role = (user as { role?: string }).role ?? "TEACHER";
        token.school = (user as { school?: string | null }).school ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
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
            session.user.plan = "FREE";
            session.user.role = "TEACHER";
            session.user.school = null;
          }
        } catch (err) {
          console.error("[auth] session callback db error:", err);
          session.user.plan = (token.plan as string) ?? "FREE";
          session.user.role = (token.role as string) ?? "TEACHER";
          session.user.school = (token.school as string | null) ?? null;
        }
      }
      return session;
    },
  },
});
