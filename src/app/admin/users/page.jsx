"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import PageShell from "@/components/PageShell";

export default function AdminUsersPage() {
  const { isAdmin, allowedUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("allowed_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  if (authLoading) {
    return (
      <PageShell title="Manage Users">
        <div className="text-slate-500">Loading...</div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell title="Manage Users">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">Admin access required.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Manage Users">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            Total: <span className="text-white font-medium">{users.length}</span> user{users.length !== 1 && "s"}
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
          >
            + Add User
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Add User Form */}
        {showAddForm && (
          <AddUserForm
            onClose={() => setShowAddForm(false)}
            onSuccess={() => { setShowAddForm(false); loadUsers(); }}
          />
        )}

        {/* Users Table */}
        {loading ? (
          <div className="text-slate-500 text-center py-8">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-slate-500 text-center py-8">No users yet</div>
        ) : (
          <div className="overflow-hidden bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80">
                <tr className="text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.email === allowedUser?.email}
                    onChanged={loadUsers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Help */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-medium text-slate-300 mb-2">📌 How it works</h3>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li><strong>Toggle Active</strong> — disable access instantly without deleting</li>
            <li><strong>Expires At</strong> — access auto-blocks after this date</li>
            <li><strong>Delete</strong> — permanently removes user (cannot delete yourself)</li>
            <li><strong>Add User</strong> — creates auth account + adds to whitelist in one step</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

function UserRow({ user, isSelf, onChanged }) {
  const [busy, setBusy] = useState(false);

  const isExpired = user.expires_at && new Date(user.expires_at) < new Date();

  const toggleActive = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("allowed_users")
      .update({ active: !user.active })
      .eq("id", user.id);
    setBusy(false);
    if (error) alert("Failed: " + error.message);
    else onChanged();
  };

  const updateExpiry = async (newDate) => {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("allowed_users")
      .update({ expires_at: newDate || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) alert("Failed: " + error.message);
    else onChanged();
  };

  const deleteUser = async () => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    if (!supabase || busy) return;
    setBusy(true);
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    const res = await fetch(`/api/admin/users?email=${encodeURIComponent(user.email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert("Failed: " + (j.error || res.statusText));
    } else {
      onChanged();
    }
  };

  return (
    <tr className="text-slate-300 hover:bg-slate-800/30 transition">
      <td className="px-4 py-3">{user.name || "—"}</td>
      <td className="px-4 py-3">
        <span className="text-slate-400">{user.email}</span>
        {isSelf && <span className="ml-2 text-xs text-emerald-400">(you)</span>}
      </td>
      <td className="px-4 py-3">
        {!user.active ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-400">
            ⊘ Disabled
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-400">
            ⏰ Expired
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400">
            ✓ Active
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.is_admin ? (
          <span className="text-purple-400 text-xs font-medium">Admin</span>
        ) : (
          <span className="text-slate-500 text-xs">User</span>
        )}
      </td>
      <td className="px-4 py-3">
        <input
          type="date"
          value={user.expires_at ? user.expires_at.slice(0, 10) : ""}
          onChange={(e) => updateExpiry(e.target.value || null)}
          disabled={busy || isSelf}
          className="bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        />
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={user.notes}>
        {user.notes || "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={busy || isSelf}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              user.active
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isSelf ? "Cannot toggle yourself" : ""}
          >
            {user.active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={deleteUser}
            disabled={busy || isSelf}
            className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={isSelf ? "Cannot delete yourself" : ""}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddUserForm({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isAdminFlag, setIsAdminFlag] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        name: name || null,
        expires_at: expiresAt || null,
        is_admin: isAdminFlag,
        notes: notes || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || res.statusText);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Add New User</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="friend@example.com"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Initial Password * (min 8 chars)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="trade2026"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-500 mt-1">User should change this on first login</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expires At (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. trial user, friend X"
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdminFlag}
            onChange={(e) => setIsAdminFlag(e.target.checked)}
            className="rounded"
          />
          Grant admin privileges
        </label>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !email || !password || password.length < 8}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
