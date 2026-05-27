"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type Friend = { id: string; name: string; token: string };
type DateEntry = { id: string; date: string; availableFriends: string[] };

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const [eventName, setEventName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newFriendName, setNewFriendName] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [addError, setAddError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/${hostToken}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load dashboard."); return; }
      setEventName(data.eventName);
      setFriends(data.friends);
      setDates(data.dates);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [hostToken]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newFriendName.trim()) { setAddError("Please enter a name."); return; }
    setAddingFriend(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, name: newFriendName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to add friend."); return; }
      setNewFriendName("");
      fetchDashboard();
    } catch {
      setAddError("Network error.");
    } finally {
      setAddingFriend(false);
    }
  }

  function getFriendLink(token: string) {
    return `${window.location.origin}/respond/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getFriendLink(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function getDashboardLink() {
    return window.location.href;
  }

  async function copyDashboardLink() {
    await navigator.clipboard.writeText(getDashboardLink());
    setCopiedToken("dashboard");
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const maxFriends = friends.length;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900">{eventName}</h1>
          <p className="text-gray-500 mt-1">Host Dashboard</p>
        </div>

        {/* Dashboard link */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Dashboard Link
          </h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
              {typeof window !== "undefined" ? getDashboardLink() : ""}
            </code>
            <button
              onClick={copyDashboardLink}
              className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              {copiedToken === "dashboard" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Bookmark this link — it&apos;s the only way back to your dashboard.
          </p>
        </div>

        {/* Add Friend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Invite Friends
          </h2>
          <form onSubmit={addFriend} className="flex gap-3">
            <input
              type="text"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Friend's name"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={addingFriend}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2 rounded-xl transition disabled:opacity-60"
            >
              {addingFriend ? "Adding..." : "Add"}
            </button>
          </form>
          {addError && <p className="mt-2 text-red-500 text-sm">{addError}</p>}

          {friends.length > 0 && (
            <ul className="mt-5 divide-y divide-gray-50">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-3">
                  <span className="font-medium text-gray-800">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <code className="hidden sm:block text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded max-w-[200px] truncate">
                      /respond/{f.token.slice(0, 8)}...
                    </code>
                    <button
                      onClick={() => copyLink(f.token)}
                      className="text-sm bg-violet-50 hover:bg-violet-100 text-violet-600 font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      {copiedToken === f.token ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Availability Results */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Availability Results
            </h2>
            <button
              onClick={fetchDashboard}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {dates.length === 0 ? (
            <p className="text-gray-400 text-sm">No dates added yet.</p>
          ) : (
            <ol className="space-y-3">
              {dates.map((d, i) => {
                const count = d.availableFriends.length;
                const pct = maxFriends > 0 ? (count / maxFriends) * 100 : 0;
                return (
                  <li key={d.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-300 w-6 text-right">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">{formatDateLabel(d.date)}</p>
                          {d.availableFriends.length > 0 ? (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {d.availableFriends.join(", ")}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 mt-0.5 italic">
                              No responses yet
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-2xl font-bold text-violet-600">{count}</span>
                        <span className="text-sm text-gray-400">/{maxFriends}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {maxFriends > 0 && (
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
