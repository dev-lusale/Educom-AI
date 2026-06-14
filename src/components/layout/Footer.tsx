import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#e8e8e8] bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center">
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg text-[#0d0d0d] tracking-tight">Educom</span>
            </div>
            <p className="text-[#6b6b76] text-sm leading-relaxed max-w-xs">
              Empowering Zambian educators with professional tools aligned to the CBC and TCZ standards.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#0d0d0d] font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Lesson Planner", href: "/lesson-planner" },
                { label: "Community", href: "/community" },
                { label: "Pricing", href: "/#pricing" },
                { label: "Dashboard", href: "/dashboard" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#6b6b76] hover:text-[#ea4c89] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#0d0d0d] font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#6b6b76] hover:text-[#ea4c89] text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#f0f0f0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#9e9ea7] text-xs">
            © {new Date().getFullYear()} Educom. Built for Zambian educators.
          </p>
          <p className="text-[#9e9ea7] text-xs">
            Aligned with TCZ · CBC · ECZ · 2022–2026 Strategic Plan
          </p>
        </div>
      </div>
    </footer>
  );
}
