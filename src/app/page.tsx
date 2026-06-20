import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Sparkles, Shield, ArrowRight, CheckCircle2, GraduationCap, Globe } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import heroBg from "@/images/background.jpeg";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  // Logged-in users go straight to their dashboard.
  // Wrap in try/catch so a DB error never crashes the landing page.
  try {
    const session = await auth();
    if (session?.user) redirect("/dashboard");
  } catch {
    // DB unavailable or auth misconfigured — show landing page anyway
  }

  return (
    <div className="min-h-screen bg-[--bg-surface]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-24 px-4 overflow-hidden bg-[--bg-canvas]">
        {/* Subtle pink bloom */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#ea4c89]/6 blur-[100px] pointer-events-none" />
        {/* Hero image strip */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Image src={heroBg} alt="" fill priority className="object-cover object-center opacity-10" quality={80} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f8f8]/60 via-transparent to-[#f8f8f8]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Pill badge */}
          

          <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold text-[--text-primary] leading-[1.08] tracking-tight mb-6 animate-fade-in">
            The Platform Built for
            <br />
            <span className="text-[#ea4c89]">Zambian Educators</span>
          </h1>

          <p className="text-[--text-secondary] text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate professional CBC-aligned lesson plans in seconds, collaborate with fellow teachers,
            and grow your practice — all in one elegant workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="drib-btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5">
              Get Started Free
              <ArrowRight size={17} />
            </Link>
            <Link href="/auth/signin" className="drib-btn-outline inline-flex items-center gap-2 text-base px-8 py-3.5">
              Sign In
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-[--text-muted] text-sm">
            Trusted by educators across all 10 provinces of Zambia
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-[--bg-surface]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-[--text-primary] mb-4 tracking-tight">
              Everything a Zambian Teacher Needs
            </h2>
            <p className="text-[--text-secondary] max-w-xl mx-auto">
              Built from the ground up for the Zambian curriculum, teaching culture, and classroom reality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="drib-card p-6 hover:shadow-card-hover transition-all duration-200 group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.iconBg }}>
                  <f.icon size={20} style={{ color: f.iconColor }} />
                </div>
                <h3 className="text-[--text-primary] font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-[--text-secondary] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 bg-[--bg-canvas]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-[--text-primary] mb-4 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-[--text-secondary]">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="drib-card p-7 flex flex-col">
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[--bg-elevated] text-[--text-secondary] mb-4">Free Plan</span>
                <div className="flex items-end gap-1.5 mt-2">
                  <span className="text-5xl font-bold text-[--text-primary]">K0</span>
                  <span className="text-[--text-secondary] mb-1.5 text-sm">/month</span>
                </div>
                <p className="text-[--text-muted] text-sm mt-2">Perfect for getting started</p>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[--text-secondary]">
                    <CheckCircle2 size={15} className="text-[#007531] mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="drib-btn-outline text-center block py-3">
                Get Started Free
              </Link>
            </div>

            {/* Premium */}
            <div className="relative bg-[#0d0d0d] rounded-2xl p-7 flex flex-col border border-[#ea4c89]/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full text-xs font-semibold bg-[#ea4c89] text-white">Most Popular</span>
              </div>
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ea4c89]/15 text-[#f082ac] mb-4">Premium Plan</span>
                <div className="flex items-end gap-1.5 mt-2">
                  <span className="text-5xl font-bold text-white">K150</span>
                  <span className="text-white/50 mb-1.5 text-sm">/month</span>
                </div>
                <p className="text-white/50 text-sm mt-2">For serious educators</p>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <CheckCircle2 size={15} className="text-[#ea4c89] mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup?plan=premium" className="drib-btn-primary text-center block py-3">
                Start Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 bg-[--bg-surface]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-[#fce4ef] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={26} className="text-[#ea4c89]" />
          </div>
          <h2 className="text-4xl font-bold text-[--text-primary] mb-4 tracking-tight">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-[--text-secondary] mb-8 text-lg">
            Join hundreds of Zambian teachers already saving hours every week.
          </p>
          <Link href="/auth/signup" className="drib-btn-primary inline-flex items-center gap-2 text-base px-10 py-3.5">
            Create Your Free Account
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const FEATURES = [
  { icon: BookOpen, iconBg: "#fce4ef", iconColor: "#ea4c89", title: "CBC Lesson Plan Generator", desc: "Generate complete, TCZ-compliant lesson plans in seconds. Covers all grades and subjects with the 3-step model." },
  { icon: Users, iconBg: "#e6f4ec", iconColor: "#007531", title: "Teacher Community", desc: "Share your lesson plans with colleagues. Cover absent teachers instantly by accessing the community library." },
  { icon: Shield, iconBg: "#eff6ff", iconColor: "#3b82f6", title: "Secure & Private", desc: "Your plans are yours. Control what you share and what stays private. Enterprise-grade security." },
  { icon: Sparkles, iconBg: "#f5f3ff", iconColor: "#8b5cf6", title: "ECZ-Aligned Homework", desc: "Every lesson plan includes homework tasks structured to match ECZ examination formats for each grade." },
  { icon: Globe, iconBg: "#fce4ef", iconColor: "#ea4c89", title: "All 10 Provinces", desc: "Built for Zambia. Locally relevant teaching aids, Zambian languages, and provincial context throughout." },
  { icon: GraduationCap, iconBg: "#e6f4ec", iconColor: "#007531", title: "Professional Growth", desc: "Track your lesson history, build a portfolio, and demonstrate your commitment to quality teaching." },
];

const FREE_FEATURES = [
  "5 lesson plans per month",
  "All grades & subjects",
  "Print & PDF export",
  "Basic community access (view only)",
  "ECZ-aligned homework suggestions",
];

const PREMIUM_FEATURES = [
  "Unlimited lesson plans",
  "Share plans to community",
  "Save & organise your library",
  "Priority plan generation",
  "Advanced teaching aids suggestions",
  "Download as word document",
  "Early access to new features",
  "Priority support",
  "Quiz , Exam ECZ standard generation ",
];
