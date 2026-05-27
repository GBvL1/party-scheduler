"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type CandidateDate = { id: string; date: string; selected: boolean };

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function formatDateShort(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).toUpperCase();
}

export default function RespondPage() {
  const { friendToken } = useParams<{ friendToken: string }>();
  const [friendName, setFriendName] = useState("");
  const [dates, setDates] = useState<CandidateDate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [glitchingId, setGlitchingId] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/availability/${friendToken}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "INVALID LINK."); return; }
      setFriendName(data.friendName);
      setDates(data.candidateDates);
      setSelected(new Set(data.candidateDates.filter((d: CandidateDate) => d.selected).map((d: CandidateDate) => d.id)));
    } catch {
      setError("NETWORK ERROR.");
    } finally {
      setLoading(false);
    }
  }, [friendToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setBooted(true), 40);
      return () => clearTimeout(t);
    }
  }, [loading]);

  function toggleDate(id: string) {
    setSaved(false);
    const wasSelected = selected.has(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!wasSelected) {
      setGlitchingId(id);
      setTimeout(() => setGlitchingId(null), 480);
    }
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
      if (!res.ok) { setError(data.error || "SAVE FAILED."); return; }
      setSaved(true);
    } catch {
      setError("NETWORK FAILURE.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 text-xs tracking-[0.4em] uppercase font-mono">
          LADDAR <span className="cursor-blink">_</span>
        </p>
      </main>
    );
  }

  if (error && !friendName) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div
            className="text-[48px] leading-none text-white mb-6"
          >
            RSA
          </div>
          <p className="text-red-400 text-xs tracking-widest font-mono border border-red-800/50 px-4 py-3 bg-red-950/20">
            [ACCESS DENIED] {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${booted ? "crt-boot" : "opacity-0"}`}>
      <div className="w-full max-w-lg flicker">

        {/* Header */}
        <div className="mb-10 text-center">
          <div
            className="logo-rsa text-[56px] leading-none tracking-tight text-white block mb-2"
            data-text="RSA"
          >
            RSA
          </div>
          <div className="w-full h-px bg-white/20 my-4" />
          <p className="text-[9px] tracking-[0.4em] text-white/30 uppercase mb-1">
            RSA INITIATION // TILLGÄNGLIGHETSRAPPORT
          </p>
          <h1 className="text-[22px] tracking-[0.2em] text-white uppercase">
            OPERATIV: {friendName}
          </h1>
          <p className="text-[10px] text-white/35 tracking-widest uppercase mt-1">
            MARKERA VILKA DATUM DU KAN
          </p>
        </div>

        {/* Date list */}
        {dates.length === 0 ? (
          <p className="text-white/30 text-xs tracking-widest font-mono text-center py-8 border border-white/10">
            INGA DATUM TILLGÄNGLIGA
          </p>
        ) : (
          <div className="space-y-px">
            {dates.map((d, i) => {
              const isSelected = selected.has(d.id);
              const isGlitching = glitchingId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDate(d.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 border text-left transition-all duration-75 group
                    ${isGlitching ? "select-glitch" : ""}
                    ${isSelected
                      ? "bg-white border-white text-black"
                      : "bg-black border-white/20 text-white hover:border-white/60"
                    }
                  `}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-[10px] font-mono shrink-0 w-5 text-right
                      ${isSelected ? "text-black/40" : "text-white/25"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs tracking-[0.15em] uppercase font-mono truncate
                        ${isSelected ? "text-black" : "text-white"}`}
                      >
                        {formatDateLabel(d.date)}
                      </p>
                    </div>
                  </div>

                  <div className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center ml-4 transition-all duration-75
                    ${isSelected ? "border-black bg-black" : "border-white/30 group-hover:border-white/70"}`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Count */}
        {dates.length > 0 && (
          <p className="text-[9px] tracking-[0.35em] text-white/25 uppercase font-mono mt-4">
            {selected.size === 0
              ? "INGA DATUM VALDA"
              : `${selected.size} DATUM MARKERADE // ${dates.length - selected.size} AVBÖJDA`
            }
          </p>
        )}

        {error && (
          <p className="text-red-400 text-[10px] tracking-widest font-mono border border-red-800/50 px-3 py-2 bg-red-950/20 mt-5">
            [ERR] {error}
          </p>
        )}

        {saved && (
          <div className="border border-white/30 text-white text-[10px] tracking-[0.3em] uppercase font-mono px-5 py-4 mt-5 bg-white/5">
            [OK] TILLGÄNGLIGHET SPARAD. DU KAN UPPDATERA NÄR SOM HELST.
          </div>
        )}

        {dates.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 border-2 border-white text-white uppercase tracking-[0.35em] py-4 text-sm font-bold hover:bg-white hover:text-black transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            style={{ fontSize: "13px" }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                SPARAR <span className="cursor-blink">_</span>
              </span>
            ) : (
              "BEKRÄFTA TILLGÄNGLIGHET"
            )}
          </button>
        )}

        <p className="mt-8 text-[9px] tracking-[0.3em] text-white/12 uppercase font-mono text-center">
          RSA SER ALLT // DETTA FORMULÄR ÄR PERSONLIGT
        </p>
      </div>
    </main>
  );
}
