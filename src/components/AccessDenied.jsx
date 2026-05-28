"use client";

import { useAuth } from "@/components/AuthProvider";

const REASON_MESSAGES = {
  not_whitelisted: {
    title: "Access not granted",
    body: "Your account is not on the whitelist. Please contact the administrator if you believe this is a mistake.",
    icon: "shield",
  },
  disabled: {
    title: "Access disabled",
    body: "Your access has been temporarily disabled. Please contact the administrator to restore it.",
    icon: "pause",
  },
  expired: {
    title: "Access expired",
    body: "Your access period has ended. Contact the administrator to renew.",
    icon: "clock",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't verify your access. Please try signing in again.",
    icon: "alert",
  },
};

function Icon({ name }) {
  const cls = "w-10 h-10 text-amber-400";
  if (name === "pause") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <rect x="6" y="5" width="4" height="14" rx="1" strokeLinecap="round"/>
      <rect x="14" y="5" width="4" height="14" rx="1" strokeLinecap="round"/>
    </svg>
  );
  if (name === "clock") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (name === "alert") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AccessDenied() {
  const { signOut, user, accessDeniedReason } = useAuth();
  const reason = REASON_MESSAGES[accessDeniedReason] || REASON_MESSAGES.error;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
          <Icon name={reason.icon} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{reason.title}</h1>
        <p className="text-slate-400 mb-2">{reason.body}</p>
        {user?.email && (
          <p className="text-sm text-slate-500 mb-8">
            Signed in as <span className="text-slate-300">{user.email}</span>
          </p>
        )}
        <button
          onClick={signOut}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
