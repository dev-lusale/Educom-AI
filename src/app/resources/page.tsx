import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResourcesClient from "./ResourcesClient";
import { getUserSubscriptionInfo } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const [resources, subInfo] = await Promise.all([
    prisma.resource.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        fileType: true,
        fileSizeBytes: true,
        grade: true,
        subject: true,
        description: true,
        chunksCreated: true,
        downloadCount: true,
        createdAt: true,
      },
    }),
    getUserSubscriptionInfo(session.user.id),
  ]);

  const isPremium = subInfo.plan === "PREMIUM";

  return (
    <ResourcesClient
      initialResources={resources.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      isPremium={isPremium}
      userName={session.user.name ?? "Teacher"}
    />
  );
}
