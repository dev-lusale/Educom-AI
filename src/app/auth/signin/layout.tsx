import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// If a user is already logged in and navigates to /auth/signin,
// send them straight to their dashboard.
export default async function SignInLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <>{children}</>;
}
