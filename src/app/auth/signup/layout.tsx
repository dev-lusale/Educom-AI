import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// If a user is already logged in and navigates to /auth/signup,
// send them straight to their dashboard.
export default async function SignUpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <>{children}</>;
}
