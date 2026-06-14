import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import ProfileSection from "@/components/settings/ProfileSection";
import {
  Crown, Shield, CreditCard, Clock, CheckCircle2,
  Calendar, AlertTriangle, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserSubscriptionInfo } from "@/lib/subscription";

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  COMPLETED: { text: "#007531", bg: "#e6f4ec" },
  PROCESSING: { text: "#d97706", bg: "#fef3c7" },
  PENDING: { text: "#3b82f6", bg: "#eff6ff" },
  FAILED: { text: "#ef4444", bg: "#fef2f2" },
  CANCELLED: { text: "#6b6b76", bg: "#f0f0f0" },
  REFUNDED: { text: "#8b5cf6", bg: "#f5f3ff" },
};

const METHOD_LABELS: Record<string, string> = {
  MTN_MOMO: "MTN Mobile Money",
  AIRTEL_MONEY: "Airtel Money",
  ZAMTEL_MONEY: "Zamtel Money",
  BANK_TRANSFER: "Bank Transfer",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const [user, subInfo, transactions, googleAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, school: true, province: true, plan: true, createdAt: true },
    }),
    getUserSubscriptionInfo(session.user.id),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, transactionRef: true, paymentMethod: true, amount: true, currency: true, status: true, receiptNumber: true, createdAt: true },
    }),
    // Detect if this user signed in via Google (has a Google OAuth account record)
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
      select: { id: true },
    }),
  ]);

  if (!user) redirect("/auth/signin");
  const isPremium = subInfo.plan === "PREMIUM";
  const isGoogleAccount = !!googleAccount;

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      <main className="pt-20 max-w-2xl mx-auto px-4 py-10">

        <h1 className="text-2xl font-bold text-[#0d0d0d] mb-7 tracking-tight">Account Settings</h1>

        {/* Profile */}
        <ProfileSection
          user={{
            name: user.name ?? null,
            email: user.email,
            school: user.school ?? null,
            province: user.province ?? null,
            createdAt: user.createdAt,
            isGoogleAccount,
          }}
        />

        {/* Subscription */}
        <div className="drib-card p-6 mb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[#fce4ef] rounded-xl flex items-center justify-center">
              <Crown size={16} className="text-[#ea4c89]" />
            </div>
            <h2 className="text-[#0d0d0d] font-semibold">Subscription</h2>
          </div>

          {isPremium ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#fce4ef] text-[#ea4c89]">Premium Plan ✦</span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  subInfo.status === "EXPIRING_SOON"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-[#e6f4ec] text-[#007531]"
                )}>
                  {subInfo.status === "EXPIRING_SOON" ? "⚠ Expiring Soon" : "✓ Active"}
                </span>
              </div>

              {subInfo.status === "EXPIRING_SOON" && subInfo.daysRemaining !== null && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <AlertTriangle size={15} className="text-yellow-500 shrink-0" />
                  <p className="text-[#0d0d0d] text-sm flex-1">
                    Expires in <strong>{subInfo.daysRemaining} day{subInfo.daysRemaining !== 1 ? "s" : ""}</strong>. Renew now.
                  </p>
                  <Link href="/payment" className="drib-btn-primary py-1.5 px-3 text-xs flex items-center gap-1 shrink-0">
                    <RefreshCw size={11} /> Renew
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Calendar, label: "Start Date", value: subInfo.startDate ? new Date(subInfo.startDate).toLocaleDateString("en-ZM", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                  { icon: Calendar, label: "Expiry Date", value: subInfo.endDate ? new Date(subInfo.endDate).toLocaleDateString("en-ZM", { day: "numeric", month: "long", year: "numeric" }) : "No expiry" },
                  { icon: CreditCard, label: "Payment Method", value: subInfo.paymentMethod ? (METHOD_LABELS[subInfo.paymentMethod] ?? subInfo.paymentMethod) : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p className="text-[#9e9ea7] text-xs mb-1 flex items-center gap-1"><Icon size={10} /> {label}</p>
                    <p className="text-[#0d0d0d] font-medium text-sm">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[#9e9ea7] text-xs mb-1 flex items-center gap-1"><Clock size={10} /> Days Remaining</p>
                  <p className={cn("font-bold text-xl", subInfo.daysRemaining !== null && subInfo.daysRemaining <= 7 ? "text-yellow-500" : "text-[#0d0d0d]")}>
                    {subInfo.daysRemaining !== null ? subInfo.daysRemaining : "∞"}
                  </p>
                </div>
              </div>

              {subInfo.receiptNumber && (
                <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
                  <p className="text-[#9e9ea7] text-xs">
                    Receipt: <span className="text-[#0d0d0d] font-mono">{subInfo.receiptNumber}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {subInfo.status === "EXPIRED" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <p className="text-[#0d0d0d] text-sm">Your Premium subscription has expired.</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f0f0f0] text-[#6b6b76] inline-block mb-2">Free Plan</span>
                  <p className="text-[#6b6b76] text-sm">Upgrade to unlock unlimited plans and community sharing.</p>
                </div>
                <Link href="/payment" className="drib-btn-primary py-2.5 px-5 text-sm flex items-center gap-1.5 shrink-0 ml-4">
                  <Crown size={13} /> Upgrade
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        {transactions.length > 0 && (
          <div className="drib-card p-6 mb-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-[#eff6ff] rounded-xl flex items-center justify-center">
                <CreditCard size={16} className="text-[#3b82f6]" />
              </div>
              <h2 className="text-[#0d0d0d] font-semibold">Payment History</h2>
            </div>
            <div className="space-y-2.5">
              {transactions.map((t) => {
                const style = STATUS_STYLES[t.status] ?? { text: "#6b6b76", bg: "#f0f0f0" };
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#f8f8f8] hover:bg-[#f0f0f0] transition-colors">
                    <div>
                      <p className="text-[#0d0d0d] font-mono text-xs font-medium">{t.transactionRef}</p>
                      <p className="text-[#9e9ea7] text-xs mt-0.5">{METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod}</p>
                      {t.receiptNumber && <p className="text-[#9e9ea7] text-[10px] mt-0.5">Receipt: {t.receiptNumber}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[#0d0d0d] font-semibold text-sm">K{t.amount}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: style.text, backgroundColor: style.bg }}>
                        {t.status}
                      </span>
                      <p className="text-[#9e9ea7] text-[10px] mt-1 flex items-center gap-1 justify-end">
                        <Clock size={9} />
                        {new Date(t.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security */}
        <div className="drib-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center">
              <Shield size={16} className="text-[#007531]" />
            </div>
            <h2 className="text-[#0d0d0d] font-semibold">Security</h2>
          </div>
          <div className="space-y-3">
            {/* Change password */}
            <div className="flex items-center justify-between py-3 border-b border-[#f0f0f0]">
              <div>
                <p className="text-[#0d0d0d] text-sm font-medium">Password</p>
                <p className="text-[#9e9ea7] text-xs mt-0.5">Reset your password via email</p>
              </div>
              <Link
                href="/auth/forgot-password"
                className="drib-btn-outline text-xs px-4 py-2"
              >
                Change Password
              </Link>
            </div>

            {/* Connected account */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-[#0d0d0d] text-sm font-medium">Email Address</p>
                <p className="text-[#9e9ea7] text-xs mt-0.5">{user.email}</p>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e6f4ec] text-[#007531]">
                <CheckCircle2 size={11} /> Verified
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
