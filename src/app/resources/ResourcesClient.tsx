"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, Trash2, Sparkles, Crown,
  Brain, CheckCircle2, AlertCircle,
  Loader2, X, Plus, FolderOpen, Info,
  FileType, Clock, Database,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Mathematics", "English Language", "Science", "Social Studies",
  "Chemistry", "Physics", "Biology", "History", "Geography",
  "Civic Education", "Religious Education", "Physical Education",
  "Commerce", "Accounting", "Agriculture", "Computer Studies",
  "Food and Nutrition", "Fashion and Fabrics", "Art and Design",
  "Music", "French", "Literature in English", "Design and Technology",
];

const GRADES = [
  "ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7",
  "Form 1", "Form 2",
  "Form 3", "Form 4",
  "Form 5", "Form 6",
];

interface Resource {
  id: string;
  originalName: string;
  fileType: string;
  fileSizeBytes: number;
  grade: string | null;
  subject: string | null;
  description: string | null;
  chunksCreated: number;
  downloadCount: number;
  createdAt: string;
}

interface Props {
  initialResources: Resource[];
  isPremium: boolean;
  userName: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  const isPdf = t === "pdf";
  const isDoc = t === "docx" || t === "doc";
  return (
    <div className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold uppercase",
      isPdf ? "bg-red-100 text-red-600" : isDoc ? "bg-blue-100 text-blue-600" : "bg-[#f0f0f0] text-[#6b6b76]"
    )}>
      {isPdf ? "PDF" : isDoc ? "DOC" : "TXT"}
    </div>
  );
}

export default function ResourcesClient({ initialResources, isPremium, userName }: Props) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstName = userName.split(" ")[0];

  const totalChunks = resources.reduce((sum, r) => sum + r.chunksCreated, 0);
  const totalSize = resources.reduce((sum, r) => sum + r.fileSizeBytes, 0);

  const handleFileSelect = useCallback((file: File) => {
    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) { toast.error("Only PDF, DOCX, and TXT files are supported."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50 MB."); return; }
    setSelectedFile(file);
    setShowUploadForm(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", selectedFile);
    if (grade) form.append("grade", grade);
    if (subject) form.append("subject", subject);
    if (description) form.append("description", description);
    try {
      const res = await fetch("/api/resources", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed."); return; }
      setResources((prev) => [data, ...prev]);
      toast.success(data.message ?? "Resource uploaded successfully.");
      resetForm();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setSelectedFile(null); setGrade(""); setSubject(""); setDescription("");
    setShowUploadForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove it from your AI knowledge base.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (res.ok) { setResources((prev) => prev.filter((r) => r.id !== id)); toast.success("Resource deleted."); }
      else toast.error("Failed to delete resource.");
    } catch { toast.error("Failed to delete resource."); }
    finally { setDeletingId(null); }
  }

  const inp = "drib-input";
  const lbl = "text-[#6b6b76] text-xs font-medium mb-1.5 block";

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1 tracking-tight">My Resources</h1>
          <p className="text-[#6b6b76] text-sm">Upload teaching materials — the AI learns from them to generate better plans.</p>
        </div>
        <button onClick={() => setShowUploadForm(true)} className="drib-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus size={15} /> Upload Resource
        </button>
      </div>

      {/* How it works */}
      <div className="drib-card p-5 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
            <Brain size={18} className="text-[#ea4c89]" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold text-sm mb-1">How your resources power the AI</p>
            <p className="text-[#6b6b76] text-sm leading-relaxed">
              Upload a PDF, DOCX, or TXT file and the AI indexes it into your personal knowledge base.
              Next time you generate a lesson plan for the same subject, the AI draws from your materials
              to produce more relevant, personalised plans.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#f0f0f0]">
          {[
            { icon: Upload, label: "1. Upload", desc: "Add PDFs, DOCX, or TXT teaching materials.", color: "#3b82f6", bg: "#eff6ff" },
            { icon: Database, label: "2. AI Indexes", desc: "The AI reads and stores your content in a knowledge base.", color: "#007531", bg: "#e6f4ec" },
            { icon: Sparkles, label: "3. Better Plans", desc: "Plans are generated using your own materials as context.", color: "#ea4c89", bg: "#fce4ef" },
          ].map(({ icon: Icon, label, desc, color, bg }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: bg }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div>
                <p className="text-[#0d0d0d] text-xs font-semibold mb-0.5">{label}</p>
                <p className="text-[#9e9ea7] text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {resources.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: resources.length, label: "Resources Uploaded", color: "#0d0d0d" },
            { value: totalChunks.toLocaleString(), label: "AI Knowledge Chunks", color: "#ea4c89" },
            { value: formatBytes(totalSize), label: "Total Storage Used", color: "#007531" },
          ].map(({ value, label, color }) => (
            <div key={label} className="drib-card p-4 text-center hover:shadow-card-hover transition-shadow">
              <p className="font-bold text-2xl leading-tight" style={{ color }}>{value}</p>
              <p className="text-[#9e9ea7] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-[#e8e8e8] shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#0d0d0d] font-semibold">Upload Resource</h2>
              <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9e9ea7] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all">
                <X size={16} />
              </button>
            </div>

            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  dragOver ? "border-[#ea4c89] bg-[#fce4ef]/30" : "border-[#e8e8e8] hover:border-[#ea4c89]/40 hover:bg-[#f8f8f8]"
                )}
              >
                <Upload size={26} className="text-[#9e9ea7] mx-auto mb-3" />
                <p className="text-[#0d0d0d] font-semibold text-sm mb-1">Drop your file here or click to browse</p>
                <p className="text-[#9e9ea7] text-xs">PDF, DOCX, TXT — up to 50 MB</p>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl mb-4">
                <FileTypeIcon type={selectedFile.name.split(".").pop() ?? "file"} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0d0d0d] text-sm font-semibold truncate">{selectedFile.name}</p>
                  <p className="text-[#9e9ea7] text-xs">{formatBytes(selectedFile.size)}</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-[#9e9ea7] hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            )}

            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Subject (optional)</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inp}>
                    <option value="">All subjects</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Grade (optional)</label>
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inp}>
                    <option value="">All grades</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Description (optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Form 3 Chemistry notes — Term 2"
                  className={inp} maxLength={200} />
              </div>
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 bg-[#fce4ef]/30 rounded-xl border border-[#f5b8d4]">
              <Info size={13} className="text-[#ea4c89] shrink-0 mt-0.5" />
              <p className="text-[#6b6b76] text-xs leading-relaxed">
                Adding subject and grade helps the AI use this resource more precisely for specific classes.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={resetForm} className="drib-btn-outline flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={handleUpload} disabled={!selectedFile || uploading}
                className="flex-1 drib-btn-primary flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload & Index</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library / Empty */}
      {resources.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#0d0d0d] font-semibold">Your Library</h2>
            <span className="text-[#9e9ea7] text-xs">{resources.length} file{resources.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-2.5">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onDelete={handleDelete} isDeleting={deletingId === resource.id} />
            ))}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "drib-card p-14 text-center border-2 border-dashed transition-all",
            dragOver ? "border-[#ea4c89] bg-[#fce4ef]/10" : "border-[#e8e8e8]"
          )}
        >
          <div className="w-14 h-14 bg-[#fce4ef] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FolderOpen size={24} className="text-[#ea4c89]" />
          </div>
          <h2 className="text-[#0d0d0d] font-semibold text-lg mb-2">No resources yet</h2>
          <p className="text-[#6b6b76] text-sm max-w-sm mx-auto mb-6">
            Hi {firstName}! Upload your lesson notes, past papers, or schemes of work. The AI will use them to generate better lesson plans.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setShowUploadForm(true)} className="drib-btn-primary inline-flex items-center gap-2 text-sm">
              <Upload size={14} /> Upload Your First Resource
            </button>
            <Link href="/lesson-planner" className="drib-btn-outline inline-flex items-center gap-2 text-sm">
              <Sparkles size={14} /> Generate a Lesson Plan
            </Link>
          </div>
          <p className="text-[#9e9ea7] text-xs mt-4">Or drag and drop a file anywhere on this page</p>
        </div>
      )}

      {/* Premium upsell */}
      {!isPremium && (
        <div className="mt-6 drib-card p-6 flex items-center gap-5 bg-gradient-to-r from-[#fce4ef]/30 to-white border-[#f5b8d4]">
          <div className="w-11 h-11 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} className="text-[#ea4c89]" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold mb-1">Premium: Unlimited Resources</p>
            <p className="text-[#6b6b76] text-sm">Free plan supports up to 3 uploads. Upgrade for unlimited uploads and priority AI indexing.</p>
          </div>
          <Link href="/payment" className="drib-btn-primary inline-flex items-center gap-2 text-sm shrink-0">
            <Crown size={13} /> Upgrade
          </Link>
        </div>
      )}
    </main>
  );
}

function ResourceCard({ resource, onDelete, isDeleting }: {
  resource: Resource;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="drib-card-hover p-4 flex items-center gap-4 group">
      <FileTypeIcon type={resource.fileType} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[#0d0d0d] font-semibold text-sm truncate">{resource.originalName}</p>
          <div className="flex items-center gap-2 shrink-0">
            {resource.chunksCreated > 0 ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e6f4ec] text-[#007531]">
                <CheckCircle2 size={9} /> Indexed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                <AlertCircle size={9} /> Pending
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
          {resource.subject && (
            <span className="text-xs px-2 py-0.5 bg-[#fce4ef] text-[#ea4c89] rounded-full">{resource.subject}</span>
          )}
          {resource.grade && (
            <span className="text-xs px-2 py-0.5 bg-[#f0f0f0] text-[#6b6b76] rounded-full">{resource.grade}</span>
          )}
          <span className="text-[#9e9ea7] text-xs flex items-center gap-1"><FileType size={10} /> {formatBytes(resource.fileSizeBytes)}</span>
          {resource.chunksCreated > 0 && (
            <span className="text-[#9e9ea7] text-xs flex items-center gap-1"><Database size={10} /> {resource.chunksCreated} chunks</span>
          )}
          <span className="text-[#9e9ea7] text-xs flex items-center gap-1">
            <Clock size={10} />
            {new Date(resource.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {resource.description && <p className="text-[#9e9ea7] text-xs mt-1.5 truncate">{resource.description}</p>}
      </div>

      <button
        onClick={() => onDelete(resource.id, resource.originalName)}
        disabled={isDeleting}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9e9ea7] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-50"
        title="Delete resource"
      >
        {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}
