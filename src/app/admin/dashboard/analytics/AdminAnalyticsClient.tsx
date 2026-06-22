"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, Crown, CreditCard } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface Stats {
  users: { total: number; active: number; premium: number; free: number };
  transactions: { total: number; completed: number; pending: number; failed: number };
  revenue: { total: number; thisMonth: number; lastMonth: number; growth: number };
  userGrowth: { date: string; count: number }[];
  revenueByMethod: { method: string; total: number; count: number }[];
}

const METHOD_LABELS: Record<string, string> = {
  MTN_MOMO: "MTN MoMo",
  AIRTEL_MONEY: "Airtel",
  ZAMTEL_MONEY: "Zamtel",
  BANK_TRANSFER: "Bank",
};

const CHART_COLORS = ["#00A344", "#007531", "#3b82f6", "#8b5cf6"];

// Tooltip style � reads CSS variables at runtime so it works in both light and dark mode
const getTooltipStyle = () => ({
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--text-primary)",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
});

export default function AdminAnalyticsClient() {
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
    return <p className="text-[--text-muted] text-center py-20">Failed to load analytics.</p>;
  }

  const planData = [
    { name: "Free",    value: stats.users.free,    color: "#e8e8e8" },
    { name: "Premium", value: stats.users.premium, color: "#00A344" },
  ];

  const txStatusData = [
    { name: "Completed", value: stats.transactions.completed, color: "#007531" },
    { name: "Pending",   value: stats.transactions.pending,   color: "#d97706" },
    { name: "Failed",    value: stats.transactions.failed,    color: "#ef4444" },
  ];

  const revenueMethodData = stats.revenueByMethod.map((r, i) => ({
    name: METHOD_LABELS[r.method] ?? r.method,
    revenue: r.total,
    transactions: r.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const userGrowthData = stats.userGrowth.map((g) => ({
    date: new Date(g.date).toLocaleDateString("en-ZM", { month: "short", day: "numeric" }),
    users: Number(g.count),
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">Analytics</h1>
        <p className="text-[--text-secondary] text-sm mt-1">Platform performance and revenue insights</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: Users,      label: "Total Users",    value: stats.users.total,                  accent: "#3b82f6", bg: "#eff6ff" },
          { icon: Crown,      label: "Premium Users",  value: stats.users.premium,                accent: "#00A344", bg: "#e6f4ec" },
          { icon: TrendingUp, label: "Total Revenue",  value: `K${stats.revenue.total.toLocaleString()}`, accent: "#007531", bg: "#e6f4ec" },
          { icon: CreditCard, label: "Completed Txns", value: stats.transactions.completed,       accent: "#8b5cf6", bg: "#f5f3ff" },
        ].map(({ icon: Icon, label, value, accent, bg }) => (
          <div key={label} className="drib-card p-4 hover:shadow-card-hover transition-shadow">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon size={16} style={{ color: accent }} />
            </div>
            <p className="text-[--text-muted] text-xs mb-1">{label}</p>
            <p className="text-[--text-primary] font-bold text-2xl">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">User Registrations (Last 7 Days)</h2>
          {userGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={getTooltipStyle()} />
                <Line type="monotone" dataKey="users" stroke="#00A344" strokeWidth={2.5}
                  dot={{ fill: "#00A344", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[--text-muted] text-sm">
              No registration data for the last 7 days.
            </div>
          )}
        </div>

        {/* Revenue by Method */}
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">Revenue by Payment Method</h2>
          {revenueMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueMethodData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={getTooltipStyle()}
                  formatter={(value) => [`K${Number(value).toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueMethodData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[--text-muted] text-sm">
              No revenue data yet.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">User Plan Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {planData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={getTooltipStyle()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {planData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-[--text-primary] text-sm font-semibold">{d.name}</p>
                    <p className="text-[--text-muted] text-xs">{d.value} users</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-4">Transaction Status</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={txStatusData.filter((d) => d.value > 0)} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {txStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={getTooltipStyle()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {txStatusData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <div>
                    <p className="text-[--text-primary] text-sm font-semibold">{d.name}</p>
                    <p className="text-[--text-muted] text-xs">{d.value} transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="drib-card p-6">
        <h2 className="text-[--text-primary] font-semibold mb-5">Revenue Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-[--text-secondary] text-sm mb-1">Total Revenue</p>
            <p className="text-[--text-primary] font-bold text-3xl">K{stats.revenue.total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[--text-secondary] text-sm mb-1">This Month</p>
            <p className="font-bold text-3xl" style={{ color: "#00A344" }}>K{stats.revenue.thisMonth.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[--text-secondary] text-sm mb-1">Last Month</p>
            <p className="text-[--text-primary] font-bold text-3xl">K{stats.revenue.lastMonth.toLocaleString()}</p>
            {stats.revenue.growth !== 0 && (
              <p className={`text-xs mt-1 font-semibold ${stats.revenue.growth >= 0 ? "text-[#007531]" : "text-red-500"}`}>
                {stats.revenue.growth >= 0 ? "+" : ""}{stats.revenue.growth}% vs last month
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
