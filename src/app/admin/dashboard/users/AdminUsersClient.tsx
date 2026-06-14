"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Filter, Crown, UserCheck, UserX, ArrowUpCircle,
  ArrowDownCircle, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Eye, MoreVertical, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  plan: "FREE" | "PREMIUM";
  role: string;
  isActive: boolean;
  school: string | null;
  province: string | null;
  createdAt: string;
  lessonPlanCount: number;
  transactionCount: number;
  subscriptionEndDate: string | null;
}

interface UserDetail extends User {
  transactions: {
    id: string; transactionRef: string; paymentMethod: string;
    amount: number; status: string; createdAt: string;
  }[];
  subscriptions: {
    id: string; plan: string; status: string;
    startDate: string | null; endDate: string | null; amount: number;
  }[];
  _count: { lessonPlans: number; sharedPlans: number };
}

const TX_STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  COMPLETED:  { text: "#007531", bg: "#e6f4ec" },
  PROCESSING: { text: "#d97706", bg: "#fef3c7" },
  PENDING:    { text: "#3b82f6", bg: "#eff6ff" },
  FAILED:     { text: "#ef4444", bg: "#fef2f2" },
  CANCELLED:  { text: "#6b6b76", bg: "#f0f0f0" },
};

export default function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    }
    setLoading(false);
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAction(userId: string, action: string) {
    setActionLoading(userId + action);
    setOpenMenu(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User ${action}d successfully.`);
        fetchUsers();
        if (selectedUser?.id === userId) loadUserDetail(userId);
      } else {
        toast.error(data.error ?? "Action failed.");
      }
    } catch { toast.error("Network error."); }
    finally { setActionLoading(null); }
  }

  async function loadUserDetail(userId: string) {
    setDetailLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`);
    if (res.ok) { const data = await res.json(); setSelectedUser(data); }
    setDetailLoading(false);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] tracking-tight">Users</h1>
          <p className="text-[#6b6b76] text-sm mt-1">{total.toLocaleString()} registered users</p>
        </div>
        <button onClick={fetchUsers} className="drib-btn-outline py-2 px-4 text-sm flex items-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="drib-card p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchUsers(); }} className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, school…"
            className="drib-input pl-10"
          />
        </form>
        <div className="flex gap-2.5">
          <div className="relative">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="drib-input pl-8 cursor-pointer">
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="drib-input cursor-pointer">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="drib-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin text-[#ea4c89]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f0f0f0] text-[#9e9ea7] text-xs">
                  <th className="text-left px-5 py-3.5 font-medium">User</th>
                  <th className="text-left px-5 py-3.5 font-medium">Plan</th>
                  <th className="text-left px-5 py-3.5 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 font-medium">Plans</th>
                  <th className="text-left px-5 py-3.5 font-medium">Joined</th>
                  <th className="text-left px-5 py-3.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#f8f8f8] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[#0d0d0d] font-semibold text-sm">{user.name ?? "—"}</p>
                      <p className="text-[#9e9ea7] text-xs">{user.email}</p>
                      {user.school && <p className="text-[#9e9ea7] text-[10px]">{user.school}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.plan === "PREMIUM" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fce4ef] text-[#ea4c89]">
                          <Crown size={10} /> Premium
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0f0f0] text-[#6b6b76]">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold",
                        user.isActive ? "bg-[#e6f4ec] text-[#007531]" : "bg-red-50 text-red-500"
                      )}>
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6b6b76] font-medium">{user.lessonPlanCount}</td>
                    <td className="px-5 py-3.5 text-[#9e9ea7] text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => loadUserDetail(user.id)}
                          className="w-7 h-7 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg flex items-center justify-center hover:border-[#d4d4d4] transition-all"
                          title="View details">
                          <Eye size={12} className="text-[#6b6b76]" />
                        </button>
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                            className="w-7 h-7 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg flex items-center justify-center hover:border-[#d4d4d4] transition-all">
                            <MoreVertical size={12} className="text-[#6b6b76]" />
                          </button>
                          {openMenu === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#e8e8e8] rounded-xl shadow-card-hover z-10 overflow-hidden">
                              {user.isActive ? (
                                <button onClick={() => handleAction(user.id, "suspend")} disabled={!!actionLoading}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                  <UserX size={12} /> Suspend User
                                </button>
                              ) : (
                                <button onClick={() => handleAction(user.id, "activate")} disabled={!!actionLoading}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#007531] hover:bg-[#e6f4ec] transition-colors">
                                  <UserCheck size={12} /> Activate User
                                </button>
                              )}
                              {user.plan === "FREE" ? (
                                <button onClick={() => handleAction(user.id, "upgrade")} disabled={!!actionLoading}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#ea4c89] hover:bg-[#fce4ef] transition-colors">
                                  <ArrowUpCircle size={12} /> Upgrade to Premium
                                </button>
                              ) : (
                                <button onClick={() => handleAction(user.id, "downgrade")} disabled={!!actionLoading}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#6b6b76] hover:bg-[#f8f8f8] transition-colors">
                                  <ArrowDownCircle size={12} /> Downgrade to Free
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-[#9e9ea7] text-center py-14 text-sm">No users found.</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[#6b6b76] text-sm">Page {page} of {pages} · {total} users</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="drib-btn-outline py-2 px-3 text-sm disabled:opacity-40">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="drib-btn-outline py-2 px-3 text-sm disabled:opacity-40">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e8e8e8] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[#f0f0f0]">
              <h2 className="text-[#0d0d0d] font-semibold">User Details</h2>
              <button onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9e9ea7] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all">
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={26} className="animate-spin text-[#ea4c89]" />
              </div>
            ) : selectedUser && (
              <div className="p-5 space-y-5">
                {/* Profile grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Name", value: selectedUser.name ?? "—" },
                    { label: "Email", value: selectedUser.email },
                    { label: "School", value: selectedUser.school ?? "—" },
                    { label: "Province", value: selectedUser.province ?? "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[#9e9ea7] text-xs mb-1">{label}</p>
                      <p className="text-[#0d0d0d] font-medium text-sm">{value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-[#9e9ea7] text-xs mb-1">Plan</p>
                    {selectedUser.plan === "PREMIUM" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fce4ef] text-[#ea4c89]">
                        <Crown size={10} /> Premium ✦
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0f0f0] text-[#6b6b76]">Free</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[#9e9ea7] text-xs mb-1">Status</p>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold",
                      selectedUser.isActive ? "bg-[#e6f4ec] text-[#007531]" : "bg-red-50 text-red-500"
                    )}>
                      {selectedUser.isActive ? "Active" : "Suspended"}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUser.isActive ? (
                    <button onClick={() => handleAction(selectedUser.id, "suspend")} disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                      <UserX size={12} /> Suspend
                    </button>
                  ) : (
                    <button onClick={() => handleAction(selectedUser.id, "activate")} disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#007531] bg-[#e6f4ec] hover:bg-[#bbf7d0] transition-colors">
                      <UserCheck size={12} /> Activate
                    </button>
                  )}
                  {selectedUser.plan === "FREE" ? (
                    <button onClick={() => handleAction(selectedUser.id, "upgrade")} disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ea4c89] bg-[#fce4ef] hover:bg-[#f5b8d4]/30 transition-colors">
                      <ArrowUpCircle size={12} /> Upgrade to Premium
                    </button>
                  ) : (
                    <button onClick={() => handleAction(selectedUser.id, "downgrade")} disabled={!!actionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6b6b76] bg-[#f0f0f0] hover:bg-[#e8e8e8] transition-colors">
                      <ArrowDownCircle size={12} /> Downgrade to Free
                    </button>
                  )}
                </div>

                {/* Recent Transactions */}
                {selectedUser.transactions.length > 0 && (
                  <div>
                    <h3 className="text-[#0d0d0d] font-semibold text-sm mb-3">Recent Transactions</h3>
                    <div className="space-y-2">
                      {selectedUser.transactions.slice(0, 5).map((t) => {
                        const s = TX_STATUS_STYLES[t.status] ?? { text: "#6b6b76", bg: "#f0f0f0" };
                        return (
                          <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-[#f8f8f8] rounded-xl text-xs">
                            <div>
                              <p className="text-[#0d0d0d] font-mono font-medium">{t.transactionRef}</p>
                              <p className="text-[#9e9ea7]">{t.paymentMethod.replace("_", " ")}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[#0d0d0d] font-semibold">K{t.amount}</p>
                              <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ color: s.text, backgroundColor: s.bg }}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
