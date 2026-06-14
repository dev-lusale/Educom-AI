"use client";

import { useState } from "react";
import { User, Pencil } from "lucide-react";
import ProfileEditModal from "./ProfileEditModal";

interface ProfileSectionProps {
  user: {
    name: string | null;
    email: string;
    school: string | null;
    province: string | null;
    createdAt: Date;
    isGoogleAccount: boolean;
  };
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  const [showModal, setShowModal] = useState(false);

  // Fields that are still blank — used to decide whether to nudge the user
  const missingFields = [
    !user.name && "Full Name",
    !user.school && "School",
    !user.province && "Province",
  ].filter(Boolean) as string[];

  const fields = [
    { label: "Full Name", value: user.name ?? "—" },
    { label: "Email", value: user.email },
    { label: "School", value: user.school ?? "—" },
    { label: "Province", value: user.province ?? "—" },
    {
      label: "Member Since",
      value: new Date(user.createdAt).toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "long",
      }),
    },
  ];

  return (
    <>
      <div className="drib-card p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#fce4ef] rounded-xl flex items-center justify-center">
              <User size={16} className="text-[#ea4c89]" />
            </div>
            <h2 className="text-[#0d0d0d] font-semibold">Profile</h2>
          </div>

          {/* Only Google (OAuth) accounts see the Edit button */}
          {user.isGoogleAccount && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#ea4c89] hover:text-[#d63f7a] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#fce4ef]"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>

        {/* Nudge banner if Google user has missing info */}
        {user.isGoogleAccount && missingFields.length > 0 && (
          <div className="mb-4 flex items-start gap-3 bg-[#fffbf0] border border-[#f6d860] rounded-xl px-4 py-3">
            <span className="text-base leading-none mt-0.5">✏️</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#0d0d0d] text-xs font-medium">
                Complete your profile
              </p>
              <p className="text-[#9e9ea7] text-xs mt-0.5">
                Add your{" "}
                {missingFields.join(", ")}{" "}
                to personalise your experience.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="drib-btn-primary text-xs py-1.5 px-3 shrink-0"
            >
              Add details
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#9e9ea7] text-xs mb-1">{label}</p>
              <p className="text-[#0d0d0d] font-medium text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <ProfileEditModal
          current={{
            name: user.name,
            school: user.school,
            province: user.province,
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
