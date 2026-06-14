"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, FileText } from "lucide-react";

interface Log {
  id: string;
  action: string;
  target: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { name: string; email: string };
}

export default function AdminLogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/logs?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs); setTotal(data.total); setPages(data.pages);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] tracking-tight">Audit Logs</h1>
          <p className="text-[#6b6b76] text-sm mt-1">{total.toLocaleString()} admin actions recorded</p>
        </div>
        <button onClick={fetchLogs} className="drib-btn-outline py-2 px-4 text-sm flex items-center gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Logs list */}
      <div className="drib-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin text-[#ea4c89]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-[#f0f0f0] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={22} className="text-[#9e9ea7]" />
            </div>
            <p className="text-[#9e9ea7] text-sm">No audit logs yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-[#f8f8f8] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Action pill + name */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#fce4ef] text-[#ea4c89]">
                        {log.action}
                      </span>
                      <span className="text-[#9e9ea7] text-xs">by {log.admin.name}</span>
                    </div>
                    {log.target && (
                      <p className="text-[#6b6b76] text-xs font-mono">Target: {log.target}</p>
                    )}
                    {log.details && (() => {
                      try {
                        const parsed = JSON.parse(log.details);
                        return (
                          <p className="text-[#9e9ea7] text-xs mt-0.5">
                            {Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        );
                      } catch {
                        return <p className="text-[#9e9ea7] text-xs mt-0.5">{log.details}</p>;
                      }
                    })()}
                    {log.ipAddress && (
                      <p className="text-[#9e9ea7] text-[10px] mt-0.5 font-mono">IP: {log.ipAddress}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#9e9ea7] text-[10px]">
                      {new Date(log.createdAt).toLocaleString("en-ZM", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[#6b6b76] text-sm">Page {page} of {pages} · {total} logs</p>
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
