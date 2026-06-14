import Navbar from "@/components/layout/Navbar";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-luxury-obsidian">
      <Navbar />
      <div className="pt-16">{children}</div>
    </div>
  );
}
