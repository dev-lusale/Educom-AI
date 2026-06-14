import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: string;
      role: string;
      school?: string | null;
    };
  }

  interface User {
    plan?: string;
    role?: string;
    school?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    role?: string;
    school?: string | null;
  }
}
