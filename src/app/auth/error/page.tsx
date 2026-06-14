import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#0d0d0d] mb-2 tracking-tight">
          Authentication Error
        </h1>
        <p className="text-[#6b6b76] mb-8 text-sm leading-relaxed">
          Something went wrong during sign in. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/signin" className="drib-btn-primary py-2.5 px-6 text-sm">
            Try Again
          </Link>
          <Link href="/auth/signup" className="drib-btn-outline py-2.5 px-6 text-sm">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
