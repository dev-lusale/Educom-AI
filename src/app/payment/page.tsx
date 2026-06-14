import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PaymentPageClient from "./PaymentPageClient";
import { getUserSubscriptionInfo } from "@/lib/subscription";

export const metadata = { title: "Upgrade to Premium" };

export default async function PaymentPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin?callbackUrl=/payment");

  const subInfo = await getUserSubscriptionInfo(session.user.id);

  // Only block if actively subscribed with more than 7 days left
  if (subInfo.status === "ACTIVE" && subInfo.daysRemaining !== null && subInfo.daysRemaining > 7) {
    redirect("/dashboard");
  }

  return (
    <PaymentPageClient
      userName={session.user.name ?? "Teacher"}
      isRenewal={subInfo.status === "EXPIRING_SOON" || subInfo.status === "EXPIRED"}
      daysRemaining={subInfo.daysRemaining}
    />
  );
}
