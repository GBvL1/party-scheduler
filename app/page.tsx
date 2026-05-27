"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function HomePage() {
  const router = useRouter();
  const today = new Date();
  const [eventName, setEventName] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDate(dateStr: string) {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!eventName.trim()) { setError("Please enter an event name."); return; }
    if (selectedDates.length === 0) { setError("Please select at least one date."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eventName.trim(), dates: selectedDates }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      router.push(`/dashboard/${data.hostToken}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const sortedSelected = [...selectedDates].sort();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900">Party Scheduler</h1>
          <p className="mt-2 text-gray-500 text-lg">Find the perfect date for everyone</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Alice's Birthday Party"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          {/* Calendar */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Candidate Dates
            </label>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded hover:bg-violet-500 transition"
                >
                  ‹
                </button>
                <span className="font-semibold">
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded hover:bg-violet-500 transition"
                >
                  ›
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 bg-violet-50">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-violet-400 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-100">
                {calCells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="bg-white h-10" />;
                  const dateStr = toDateStr(calYear, calMonth, day);
                  const isSelected = selectedDates.includes(dateStr);
                  const isPast = dateStr < todayStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => toggleDate(dateStr)}
                      className={`bg-white h-10 text-sm font-medium transition
                        ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-violet-50 cursor-pointer"}
                        ${isSelected ? "!bg-violet-600 !text-white" : "text-gray-700"}
                        ${dateStr === todayStr && !isSelected ? "ring-2 ring-inset ring-violet-400" : ""}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected dates list */}
            {sortedSelected.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sortedSelected.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {formatDateLabel(d)}
                    <button
                      type="button"
                      onClick={() => toggleDate(d)}
                      className="ml-1 text-violet-400 hover:text-violet-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-xl transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Event & Get Links →"}
          </button>
        </form>
      </div>
    </main>
  );
}
