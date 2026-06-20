"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Trash2, BookOpen, ClipboardList,
  FileText, Users, GraduationCap, Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Props {
  initialMessages: Message[];
  userName: string;
  userPlan: string;
}

// ── Quick-action prompts ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: BookOpen,
    label: "Lesson plan ideas",
    prompt: "Can you suggest some engaging lesson plan ideas for teaching fractions to Grade 5 learners?",
    color: "#ea4c89",
    bg: "#fce4ef",
  },
  {
    icon: ClipboardList,
    label: "Assessment tips",
    prompt: "What are the best ways to design ECZ-aligned assessments for Form 2 Mathematics?",
    color: "#007531",
    bg: "#e6f4ec",
  },
  {
    icon: FileText,
    label: "CBC competencies",
    prompt: "Explain the five CBC competencies and how I can incorporate them into my daily lessons.",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    icon: Users,
    label: "Classroom management",
    prompt: "What are effective classroom management strategies for large classes in Zambian schools?",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    icon: GraduationCap,
    label: "Teaching strategies",
    prompt: "What learner-centered teaching strategies work best for Science in upper primary?",
    color: "#ea4c89",
    bg: "#fce4ef",
  },
  {
    icon: FileText,
    label: "Scheme of work",
    prompt: "How do I structure a Term 1 scheme of work for Grade 9 Mathematics?",
    color: "#f59e0b",
    bg: "#fef9c3",
  },
];

// ── Markdown-lite renderer ────────────────────────────────────────────────────

function renderContent(text: string) {
  // Split into lines and process
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[•\-\*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[•\-\*]\s/)) {
        items.push(lines[i].replace(/^[•\-\*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={i} className="list-none space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="text-zambia-gold mt-1 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-none space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="text-zambia-gold font-bold shrink-0 min-w-[1.2rem]">{j + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    );
    i++;
  }

  return elements;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-black/[0.06] px-1 py-0.5 rounded text-xs font-mono">$1</code>');
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssistantClient({ initialMessages, userName, userPlan }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const firstName = userName.split(" ")[0];
  const isPremium = userPlan === "PREMIUM";
  const isEmpty = messages.length === 0;

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    if (loading || messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  // Show scroll-to-bottom button when scrolled up
  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    const typingMsg: Message = {
      id: typingId,
      role: "assistant",
      content: "__typing__",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, typingMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get a response.");
      }

      // Replace typing indicator with real reply
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => prev.filter((m) => m.id !== typingId).concat(assistantMsg));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function clearHistory() {
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    setClearing(true);
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([]);
      toast.success("Chat history cleared.");
    } catch {
      toast.error("Failed to clear history.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen max-w-4xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[--border] bg-[--bg-surface] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ea4c89] rounded-xl flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[--text-primary] font-semibold text-sm">Educom AI Assistant</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce4ef] text-[#ea4c89]">
                BETA
              </span>
            </div>
            <p className="text-[--text-muted] text-xs">Your Zambian teaching companion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[--text-muted] hover:text-red-500 hover:bg-red-50 transition-all"
              title="Clear chat history"
            >
              {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
          <Link
            href="/lesson-planner"
            className="drib-btn-dark flex items-center gap-1.5 text-xs px-3 py-1.5"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">Lesson Planner</span>
          </Link>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center min-h-full py-8">
            <div className="w-16 h-16 bg-[#ea4c89] rounded-2xl flex items-center justify-center mb-5">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[--text-primary] mb-2 text-center tracking-tight">
              Hello, {firstName}! 👋
            </h2>
            <p className="text-[--text-secondary] text-sm text-center max-w-md mb-8 leading-relaxed">
              I&apos;m your Educom AI teaching assistant. I can help you with lesson planning,
              curriculum questions, teaching strategies, assessments, and anything else you need
              as a Zambian teacher.
            </p>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="drib-card p-4 text-left hover:shadow-card-hover transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: action.bg }}>
                    <action.icon size={15} style={{ color: action.color }} />
                  </div>
                  <p className="text-[--text-primary] text-xs font-medium leading-snug group-hover:text-[#ea4c89] transition-colors">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>

            <p className="text-[--text-muted] text-xs mt-8 text-center">
              Type a question below or click a suggestion to get started
            </p>
          </div>
        ) : (
          /* Message list */
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} userName={firstName} />
            ))}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 w-9 h-9 bg-[--bg-surface] border border-black/[0.08] rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all shadow-md z-10"
        >
          <ChevronDown size={16} />
        </button>
      )}

      {/* ── Quick actions strip (when chat has messages) ── */}
      {!isEmpty && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
          {QUICK_ACTIONS.slice(0, 4).map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[--bg-surface] border border-black/[0.06] rounded-full text-xs text-gray-500 hover:text-gray-900 hover:border-black/12 transition-all whitespace-nowrap shrink-0 disabled:opacity-50 shadow-sm"
            >
              <action.icon size={11} className={action.color} />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div className="px-4 pb-4 pt-2 border-t border-[--border] bg-[--bg-surface] shrink-0">
        <div className="flex items-end gap-3 bg-[--bg-canvas] border border-[--border] rounded-2xl px-4 py-3 focus-within:border-[#ea4c89] transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about teaching, curriculum, or lesson planning…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-[--text-primary] text-sm placeholder:text-[--text-muted] resize-none outline-none leading-relaxed disabled:opacity-50 min-h-[1.5rem]"
            style={{ maxHeight: "160px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
              input.trim() && !loading
                ? "bg-[#ea4c89] text-white hover:bg-[#d6437a]"
                : "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[--text-muted] text-[10px] text-center mt-2">
          Press Enter to send · Shift+Enter for new line · AI responses may not always be accurate
        </p>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, userName }: { message: Message; userName: string }) {
  const isUser = message.role === "user";
  const isTyping = message.content === "__typing__";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[#0F1110] rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-white text-sm leading-relaxed">{message.content}</p>
          <p className="text-white/40 text-[10px] mt-1 text-right">
            {new Date(message.createdAt).toLocaleTimeString("en-ZM", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 bg-[#ea4c89] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#ea4c89] text-xs font-semibold">Educom AI</span>
          {!isTyping && (
            <span className="text-[--text-muted] text-[10px]">
              {new Date(message.createdAt).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl rounded-tl-sm px-4 py-3 text-[--text-secondary] text-sm shadow-card">
          {isTyping ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 bg-[#ea4c89]/60 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-[#ea4c89]/60 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-[#ea4c89]/60 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="space-y-0.5">{renderContent(message.content)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
