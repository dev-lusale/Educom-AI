"use client";

import { useEffect, useState } from "react";
import {
  Users, CreditCard, TrendingUp, Crown, CheckCircle2,
  Clock, XCircle, ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  users: { total: number; active: number; premium: number; free: number };
  transactions: { total: number; completed: number; pending: number; failed: number };
  revenue: { total: number; thisMonth: number; lastMonth: number; growth: number };
  recentTransactions: {
    id: string; ref: string; user: string; method: string;
    amount: number; status: string; createdAt: string;
  }[];
  userGrowth: { date: string; count: number }[];
  revenueByMethod: { method: string; total: number; count: number }[];
}

const METHOD_LABELS: Record<string, string> = {
  MTN_MOMO: "MTN MoMo",
  AIRTEL_MONEY: "Airtel Money",
  ZAMTEL_MONEY: "Zamtel Money",
  BANK_TRANSFER: "Bank Transfer",
};

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  COMPLETED:  { text: "#007531", bg: "#e6f4ec" },
  PROCESSING: { text: "#d97706", bg: "#fef3c7" },
  PENDING:    { text: "#3b82f6", bg: "#eff6ff" },
  FAILED:     { text: "#ef4444", bg: "#fef2f2" },
  CANCELLED:  { text: "#6b6b76", bg: "#f0f0f0" },
  REFUNDED:   { text: "#8b5cf6", bg: "#f5f3ff" },
};

export default function AdminOverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#00A344]" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-[--text-muted] text-center py-20">Failed to load stats.</p>;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">Dashboard Overview</h1>
        <p className="text-[--text-secondary] text-sm mt-1">Platform performance at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Users}      label="Total Users"    value={stats.users.total.toLocaleString()}
          sub={`${stats.users.active} active`} accent="#3b82f6" accentBg="#eff6ff" />
        <KpiCard icon={Crown}      label="Premium Users"  value={stats.users.premium.toLocaleString()}
          sub={`${stats.users.free} on free plan`} accent="#00A344" accentBg="#e6f4ec" />
        <KpiCard icon={TrendingUp} label="Total Revenue"  value={`K${stats.revenue.total.toLocaleString()}`}
          sub={`K${stats.revenue.thisMonth.toLocaleString()} this month`} accent="#007531" accentBg="#e6f4ec"
          growth={stats.revenue.growth} />
        <KpiCard icon={CreditCard} label="Transactions"   value={stats.transactions.total.toLocaleString()}
          sub={`${stats.transactions.completed} completed`} accent="#8b5cf6" accentBg="#f5f3ff" />
      </div>

      {/* Transaction Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: CheckCircle2, label: "Completed", value: stats.transactions.completed, accent: "#007531", bg: "#e6f4ec" },
          { icon: Clock,        label: "Pending / Processing", value: stats.transactions.pending, accent: "#d97706", bg: "#fef3c7" },
          { icon: XCircle,      label: "Failed", value: stats.transactions.failed, accent: "#ef4444", bg: "#fef2f2" },
        ].map(({ icon: Icon, label, value, accent, bg }) => (
          <div key={label} className="drib-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-[--text-muted] text-xs">{label}</p>
              <p className="text-[--text-primary] font-bold text-2xl leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Transactions — 2 cols */}
        <div className="xl:col-span-2 drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[--text-muted] text-xs border-b border-[--border]">
                  <th className="text-left pb-3 font-medium">User</th>
                  <th className="text-left pb-3 font-medium">Method</th>
                  <th className="text-left pb-3 font-medium">Amount</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {stats.recentTransactions.map((t) => {
                  const s = STATUS_STYLES[t.status] ?? { text: "#6b6b76", bg: "#f0f0f0" };
                  return (
                    <tr key={t.id} className="hover:bg-[--bg-canvas] transition-colors">
                      <td className="py-3 text-[--text-primary] font-medium truncate max-w-[120px]">{t.user}</td>
                      <td className="py-3 text-[--text-secondary] text-xs">{METHOD_LABELS[t.method] ?? t.method}</td>
                      <td className="py-3 text-[--text-primary] font-semibold">K{t.amount}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: s.text, backgroundColor: s.bg }}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 text-[--text-muted] text-xs">
                        {new Date(t.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  );
                })}
                {stats.recentTransactions.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-[--text-muted] text-sm">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by Method — 1 col */}
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">Revenue by Method</h2>
          {stats.revenueByMethod.length > 0 ? (
            <div className="space-y-4">
              {stats.revenueByMethod.map((r) => {
                const pct = stats.revenue.total > 0
                  ? Math.round((r.total / stats.revenue.total) * 100)
                  : 0;
                return (
                  <div key={r.method}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[--text-secondary] text-xs">{METHOD_LABELS[r.method] ?? r.method}</span>
                      <span className="text-[--text-primary] text-xs font-semibold">K{r.total.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[--bg-elevated] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00A344] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[--text-muted] text-[10px] mt-0.5">{r.count} transactions · {pct}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-8">No revenue data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent, accentBg, growth }: {
  icon: React.ElementType; label: string; value: string;
  sub: string; accent: string; accentBg: string; growth?: number;
}) {
  return (
    <div className="drib-card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentBg }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        {growth !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
            growth >= 0 ? "text-[#007531] bg-[#e6f4ec]" : "text-red-500 bg-red-50"
          )}>
            {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <p className="text-[--text-muted] text-xs mb-1">{label}</p>
      <p className="text-[--text-primary] font-bold text-2xl leading-tight">{value}</p>
      <p className="text-[--text-muted] text-xs mt-1">{sub}</p>
    </div>
  );
}
