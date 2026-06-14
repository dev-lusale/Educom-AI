import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AssistantClient from "./AssistantClient";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  // Load the last 60 messages for initial render
  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return (
    <AssistantClient
      initialMessages={messages.map((m) => ({
        ...m,
        role: m.role as "user" | "assistant",
        createdAt: m.createdAt.toISOString(),
      }))}
      userName={session.user.name ?? "Teacher"}
      userPlan={session.user.plan ?? "FREE"}
    />
  );
}
