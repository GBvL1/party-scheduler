"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type CandidateDate = { id: string; date: string; selected: boolean };

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RespondPage() {
  const { friendToken } = useParams<{ friendToken: string }>();
  const [friendName, setFriendName] = useState("");
  const [eventName, setEventName] = useState("");
  const [dates, setDates] = useState<CandidateDate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/availability/${friendToken}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid link."); return; }
      setFriendName(data.friendName);
      setEventName(data.eventName);
      setDates(data.candidateDates);
      setSelected(new Set(data.candidateDates.filter((d: CandidateDate) => d.selected).map((d: CandidateDate) => d.id)));
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [friendToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleDate(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/availability/${friendToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDateIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save."); return; }
      setSaved(true);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading...</p>
      </main>
    );
  }

  if (error && !friendName) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <h1 className="text-2xl font-bold text-gray-900">Link not found</h1>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">📅</div>
          <h1 className="text-3xl font-bold text-gray-900">{eventName}</h1>
          <p className="text-gray-500 mt-1">
            Hey <strong>{friendName}</strong>, pick the dates you&apos;re free!
          </p>
        </div>

        {/* Date picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          {dates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No candidate dates have been added yet.
            </p>
          ) : (
            dates.map((d) => {
              const isSelected = selected.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDate(d.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition font-medium text-left
                    ${isSelected
                      ? "border-violet-500 bg-violet-50 text-violet-800"
                      : "border-gray-100 bg-gray-50 text-gray-700 hover:border-violet-200 hover:bg-violet-50"
                    }
                  `}
                >
                  <span>{formatDateLabel(d.date)}</span>
                  <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition
                    ${isSelected ? "border-violet-500 bg-violet-500" : "border-gray-300"}`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Summary */}
        {dates.length > 0 && (
          <p className="text-center text-sm text-gray-500">
            {selected.size === 0
              ? "No dates selected yet"
              : `${selected.size} date${selected.size > 1 ? "s" : ""} selected`}
          </p>
        )}

        {error && (
          <p className="text-center text-red-500 text-sm font-medium">{error}</p>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-center font-medium">
            ✓ Your availability has been saved!
          </div>
        )}

        {dates.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl transition disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save My Availability"}
          </button>
        )}

        <p className="text-center text-xs text-gray-400">
          You can come back to this link at any time to update your availability.
        </p>
      </div>
    </main>
  );
}
