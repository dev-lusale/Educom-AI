"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import DeleteAccountModal from "./DeleteAccountModal";

interface Props {
  userEmail: string;
}

export default function DangerZoneSection({ userEmail }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="drib-card p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <h2 className="text-[--text-primary] font-semibold">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[--text-primary] text-sm font-medium">Delete Account</p>
            <p className="text-[--text-muted] text-xs mt-0.5">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            <Trash2 size={13} />
            Delete Account
          </button>
        </div>
      </div>

      {showModal && (
        <DeleteAccountModal
          userEmail={userEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
