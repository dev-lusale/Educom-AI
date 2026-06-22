"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, RefreshCw, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  transactionRef: string;
  externalRef: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  phoneNumber: string | null;
  bankName: string | null;
  receiptNumber: string | null;
  failureReason: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
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

export default function AdminTransactionsClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (methodFilter) params.set("method", methodFilter);
    const res = await fetch(`/api/admin/transactions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions); setTotal(data.total); setPages(data.pages);
    }
    setLoading(false);
  }, [page, search, statusFilter, methodFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  function exportCSV() {
    const headers = ["Ref", "User", "Email", "Method", "Amount", "Currency", "Status", "Receipt", "Date"];
    const rows = transactions.map((t) => [
      t.transactionRef, t.user.name ?? "", t.user.email,
      METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod,
      t.amount, t.currency, t.status, t.receiptNumber ?? "",
      new Date(t.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `educom-transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">Transactions</h1>
          <p className="text-[--text-secondary] text-sm mt-1">{total.toLocaleString()} total transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="drib-btn-outline py-2 px-4 text-sm flex items-center gap-2">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={fetchTransactions} className="drib-btn-outline py-2 px-4 text-sm flex items-center gap-2">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="drib-card p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchTransactions(); }} className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref, receipt, user email�"
            className="drib-input pl-10"
          />
        </form>
        <div className="flex gap-2.5">
          <div className="relative">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="drib-input pl-8 cursor-pointer">
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="drib-input cursor-pointer">
            <option value="">All Methods</option>
            <option value="MTN_MOMO">MTN MoMo</option>
            <option value="AIRTEL_MONEY">Airtel Money</option>
            <option value="ZAMTEL_MONEY">Zamtel Money</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="drib-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin text-[#00A344]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border] text-[--text-muted] text-xs">
                  <th className="text-left px-5 py-3.5 font-medium">Reference</th>
                  <th className="text-left px-5 py-3.5 font-medium">User</th>
                  <th className="text-left px-5 py-3.5 font-medium">Method</th>
                  <th className="text-left px-5 py-3.5 font-medium">Amount</th>
                  <th className="text-left px-5 py-3.5 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 font-medium">Receipt</th>
                  <th className="text-left px-5 py-3.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {transactions.map((t) => {
                  const s = STATUS_STYLES[t.status] ?? { text: "#6b6b76", bg: "#f0f0f0" };
                  return (
                    <tr key={t.id} className="hover:bg-[--bg-canvas] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-[--text-primary] font-mono text-xs font-medium">{t.transactionRef}</p>
                        {t.phoneNumber && <p className="text-[--text-muted] text-[10px]">{t.phoneNumber}</p>}
                        {t.bankName && <p className="text-[--text-muted] text-[10px]">{t.bankName}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[--text-primary] font-medium">{t.user.name ?? "�"}</p>
                        <p className="text-[--text-muted] text-xs">{t.user.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[--text-secondary] text-xs">{METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-[--text-primary] font-semibold">K{t.amount}</span>
                        <span className="text-[--text-muted] text-xs ml-1">{t.currency}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: s.text, backgroundColor: s.bg }}>
                          {t.status}
                        </span>
                        {t.failureReason && (
                          <p className="text-red-400 text-[10px] mt-0.5 max-w-[120px] truncate" title={t.failureReason}>
                            {t.failureReason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[--text-secondary] font-mono text-xs">{t.receiptNumber ?? "�"}</td>
                      <td className="px-5 py-3.5 text-[--text-muted] text-xs">
                        {new Date(t.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <p className="text-[--text-muted] text-center py-14 text-sm">No transactions found.</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[--text-secondary] text-sm">Page {page} of {pages} � {total} transactions</p>
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
    </div>
  );
}
