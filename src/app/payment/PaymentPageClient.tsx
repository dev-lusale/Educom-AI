"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  Crown, CheckCircle2, Loader2, ArrowLeft, Shield, Clock, Zap, Copy, Check,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

import mtnLogo from "@/images/mtn_logo.png";
import airtelLogo from "@/images/airtel_logo.png";
import zamtelLogo from "@/images/zamtel_logo.png";
import bankLogo from "@/images/bank_logo.png";

type PaymentMethod = "MTN_MOMO" | "AIRTEL_MONEY" | "ZAMTEL_MONEY" | "BANK_TRANSFER";
type Step = "select" | "details" | "processing" | "success" | "failed";

interface PaymentResult {
  transactionId: string;
  transactionRef: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  message?: string;
  instructions?: string;
  referenceCode?: string;
  receiptNumber?: string;
}

import type { StaticImageData } from "next/image";

const METHODS: {
  id: PaymentMethod;
  label: string;
  shortLabel: string;
  borderColor: string;
  logo: StaticImageData;
}[] = [
  { id: "MTN_MOMO", label: "MTN Mobile Money", shortLabel: "MTN MoMo", borderColor: "#fbbf24", logo: mtnLogo },
  { id: "AIRTEL_MONEY", label: "Airtel Money", shortLabel: "Airtel Money", borderColor: "#ef4444", logo: airtelLogo },
  { id: "ZAMTEL_MONEY", label: "Zamtel Money", shortLabel: "Zamtel Money", borderColor: "#22c55e", logo: zamtelLogo },
  { id: "BANK_TRANSFER", label: "Bank Transfer", shortLabel: "Bank Transfer", borderColor: "#3b82f6", logo: bankLogo },
];

const BANKS = [
  "Zanaco", "Standard Chartered", "Stanbic Bank", "First National Bank",
  "Atlas Mara", "Absa Bank", "Indo Zambia Bank", "Access Bank",
  "United Bank for Africa", "Citibank", "Bank of China", "Other",
];

export default function PaymentPageClient({ userName, isRenewal, daysRemaining }: {
  userName: string;
  isRenewal?: boolean;
  daysRemaining?: number | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"mobile" | "bank">("mobile");

  const selectedMethodData = METHODS.find((m) => m.id === selectedMethod);
  const isMobileMoney = selectedMethod && selectedMethod !== "BANK_TRANSFER";

  function handleSelectMethod(method: PaymentMethod) {
    setSelectedMethod(method);
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMethod) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { method: selectedMethod };
      if (isMobileMoney) body.phoneNumber = phoneNumber;
      if (selectedMethod === "BANK_TRANSFER") { body.bankName = bankName; body.accountNumber = accountNumber; }

      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Payment initiation failed."); setLoading(false); return; }
      setResult(data);
      setStep("processing");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!result?.transactionId) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: result.transactionId }),
      });
      const data = await res.json();
      if (data.status === "COMPLETED") {
        setResult((prev) => prev ? { ...prev, receiptNumber: data.receiptNumber } : prev);
        setStep("success");
        toast.success("Payment confirmed! Welcome to Premium.");
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
        setStep("failed");
        toast.error(data.message ?? "Payment failed.");
      } else {
        toast("Payment still processing. Please wait.", { icon: "⏳" });
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      <main className="pt-24 pb-16 px-4 max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#fce4ef] rounded-2xl mb-4">
            <Crown size={24} className="text-[#ea4c89]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] mb-2 tracking-tight">
            {isRenewal ? "Renew Premium" : "Upgrade to Premium"}
          </h1>
          <p className="text-[#6b6b76] text-sm">
            {isRenewal && daysRemaining !== null && daysRemaining !== undefined && daysRemaining > 0
              ? `Hello ${userName} — your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Renew to keep full access.`
              : isRenewal
              ? `Hello ${userName} — your subscription has expired. Renew to restore premium access.`
              : `Hello ${userName} — unlock unlimited lesson plans, community sharing, and more.`}
          </p>
        </div>

        {/* Price card */}
        <div className="drib-card p-5 mb-7 flex items-center justify-between border-[#f5b8d4] bg-gradient-to-r from-[#fce4ef]/30 to-white">
          <div>
            <p className="text-[#ea4c89] font-semibold text-sm mb-1">Premium Plan</p>
            <div className="flex items-end gap-1">
              <span className="text-[#0d0d0d] text-3xl font-bold">K150</span>
              <span className="text-[#9e9ea7] text-sm mb-0.5">/month</span>
            </div>
          </div>
          <ul className="text-[#6b6b76] text-xs space-y-1.5">
            {["Unlimited lesson plans", "Unlimited assessments & exams", "Community sharing", "PDF export", "Priority support"].map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-[#ea4c89]" /> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Step: Select ── */}
        {step === "select" && (
          <div className="drib-card p-6">
            <p className="text-[#9e9ea7] text-xs font-semibold uppercase tracking-wider mb-4">Choose Payment Method</p>

            {/* Tab bar */}
            <div className="flex border-b border-[#f0f0f0] mb-5">
              {[{ key: "mobile", label: "Mobile Money" }, { key: "bank", label: "Bank Transfer" }].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "mobile" | "bank")}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium transition-colors relative",
                    activeTab === tab.key
                      ? "text-[#ea4c89] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#ea4c89] after:rounded-t"
                      : "text-[#6b6b76] hover:text-[#0d0d0d]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile money grid */}
            {activeTab === "mobile" && (
              <div className="grid grid-cols-3 gap-3">
                {METHODS.filter((m) => m.id !== "BANK_TRANSFER").map((m) => (
                  <button key={m.id} onClick={() => handleSelectMethod(m.id)}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl p-4 bg-[#f8f8f8] border border-[#e8e8e8] hover:border-[#ea4c89]/50 hover:bg-[#fce4ef]/30 transition-all">
                    <div className="w-13 h-13 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1">
                      <Image src={m.logo} alt={m.label} width={44} height={44} className="object-contain" />
                    </div>
                    <span className="text-xs text-[#6b6b76] group-hover:text-[#0d0d0d] font-medium text-center leading-tight">{m.shortLabel}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === "bank" && (
              <div className="grid grid-cols-1 gap-3">
                {METHODS.filter((m) => m.id === "BANK_TRANSFER").map((m) => (
                  <button key={m.id} onClick={() => handleSelectMethod(m.id)}
                    className="group flex items-center gap-4 rounded-xl p-4 bg-[#f8f8f8] border border-[#e8e8e8] hover:border-[#3b82f6]/50 hover:bg-[#eff6ff]/30 transition-all">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1">
                      <Image src={m.logo} alt={m.label} width={40} height={40} className="object-contain" />
                    </div>
                    <div className="text-left">
                      <p className="text-[#0d0d0d] font-semibold text-sm">{m.label}</p>
                      <p className="text-[#6b6b76] text-xs">Transfer from any Zambian bank</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-5 text-[#9e9ea7] text-xs justify-center">
              <Shield size={11} />
              All payments are encrypted and processed securely
            </div>
          </div>
        )}

        {/* ── Step: Details ── */}
        {step === "details" && selectedMethodData && (
          <div className="drib-card p-6">
            <button onClick={() => setStep("select")}
              className="flex items-center gap-2 text-[#6b6b76] hover:text-[#0d0d0d] text-sm mb-6 transition-colors">
              <ArrowLeft size={15} /> Back to payment methods
            </button>

            <div className="flex items-center gap-3 p-4 bg-[#f8f8f8] rounded-xl border border-[#e8e8e8] mb-6">
              <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1">
                <Image src={selectedMethodData.logo} alt={selectedMethodData.label} width={36} height={36} className="object-contain" />
              </div>
              <div>
                <p className="text-[#0d0d0d] font-semibold text-sm">{selectedMethodData.label}</p>
                <p className="text-[#9e9ea7] text-xs">K150 ZMW · 30-day Premium access</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isMobileMoney && (
                <div>
                  <label className="block text-xs font-medium text-[#6b6b76] mb-1.5">
                    {selectedMethodData.shortLabel} Phone Number
                  </label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={selectedMethod === "MTN_MOMO" ? "e.g. 0761234567" : selectedMethod === "ZAMTEL_MONEY" ? "e.g. 0951234567" : "e.g. 0971234567"}
                    className="drib-input" required />
                </div>
              )}
              {selectedMethod === "BANK_TRANSFER" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b76] mb-1.5">Your Bank</label>
                    <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="drib-input cursor-pointer" required>
                      <option value="">Select your bank</option>
                      {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b76] mb-1.5">Your Account Number</label>
                    <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Your bank account number" className="drib-input" required />
                  </div>
                </>
              )}
              <button type="submit" disabled={loading} className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base">
                {loading ? <><Loader2 size={17} className="animate-spin" /> Processing…</> : <><Zap size={17} /> Pay K150 Now</>}
              </button>
            </form>
          </div>
        )}

        {/* ── Step: Processing ── */}
        {step === "processing" && result && (
          <div className="drib-card p-6 text-center">
            <div className="w-14 h-14 bg-[#fce4ef] rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-[#ea4c89] animate-pulse" />
            </div>
            <h2 className="text-[#0d0d0d] font-bold text-xl mb-2">Payment Initiated</h2>

            {result.method === "BANK_TRANSFER" ? (
              <div className="text-left mt-5">
                <div className="bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl p-4 mb-4">
                  <p className="text-[#6b6b76] text-sm mb-2">Bank Transfer Instructions:</p>
                  <p className="text-[#0d0d0d] text-sm leading-relaxed">{result.instructions}</p>
                </div>
                <div className="bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl p-4 flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[#9e9ea7] text-xs mb-1">Reference Code</p>
                    <p className="text-[#ea4c89] font-mono font-semibold">{result.referenceCode}</p>
                  </div>
                  <button onClick={() => copyToClipboard(result.referenceCode ?? "")}
                    className="flex items-center gap-1.5 text-xs text-[#6b6b76] hover:text-[#0d0d0d] transition-colors">
                    {copied ? <Check size={13} className="text-[#007531]" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[#6b6b76] text-sm text-center mb-5">After completing the transfer, click below to verify.</p>
              </div>
            ) : (
              <div className="mt-4 mb-5">
                <p className="text-[#6b6b76] text-sm">{result.message}</p>
                <div className="bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl p-4 mt-4 text-left">
                  <p className="text-[#9e9ea7] text-xs mb-1">Transaction Reference</p>
                  <p className="text-[#0d0d0d] font-mono text-sm">{result.transactionRef}</p>
                </div>
                <p className="text-[#6b6b76] text-sm mt-4">Check your phone for a payment prompt and approve it, then click verify.</p>
              </div>
            )}

            <button onClick={handleVerify} disabled={verifying} className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {verifying ? <><Loader2 size={17} className="animate-spin" /> Verifying…</> : <><CheckCircle2 size={17} /> Verify Payment</>}
            </button>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="drib-card p-8 text-center">
            <div className="w-16 h-16 bg-[#e6f4ec] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={30} className="text-[#007531]" />
            </div>
            <h2 className="text-[#0d0d0d] font-bold text-2xl mb-2">Payment Successful!</h2>
            <p className="text-[#6b6b76] mb-6 text-sm">Your Premium subscription is now active. Welcome to the full Educom experience!</p>

            <div className="bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl p-5 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Amount Paid", value: "K150 ZMW" },
                  { label: "Plan", value: "Premium" },
                  { label: "Receipt Number", value: result?.receiptNumber ?? "—" },
                  { label: "Valid For", value: "30 days" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[#9e9ea7] text-xs mb-0.5">{label}</p>
                    <p className="text-[#0d0d0d] font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => router.push("/dashboard")} className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              <Crown size={16} /> Go to Dashboard
            </button>
          </div>
        )}

        {/* ── Step: Failed ── */}
        {step === "failed" && (
          <div className="drib-card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">✗</span>
            </div>
            <h2 className="text-[#0d0d0d] font-bold text-2xl mb-2">Payment Failed</h2>
            <p className="text-[#6b6b76] mb-6 text-sm">Your payment could not be processed. Please try again or contact support.</p>
            <button onClick={() => { setStep("select"); setSelectedMethod(null); setResult(null); }}
              className="drib-btn-primary w-full py-3.5">
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
