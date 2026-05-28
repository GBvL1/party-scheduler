"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { GlitchText } from "@/app/components/GlitchText";
import { playClick, playConfirm, playError, playToggle, playWelcomeBack, playBlip } from "@/lib/sound";

type CandidateDate = { id: string; date: string; selected: boolean };
type MonthGroup = { monthKey: string; label: string; dates: CandidateDate[] };
type CalendarMonthData = { monthKey: string; year: number; month: number; label: string; cells: (number | null)[] };

const SW_DAYS = ["MÅN", "TIS", "ONS", "TOR", "FRE", "LÖR", "SÖN"];

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function groupDatesByMonth(dates: CandidateDate[]): MonthGroup[] {
  const result: MonthGroup[] = [];
  for (const d of dates) {
    const [year, month] = d.date.split("-");
    const monthKey = `${year}-${month}`;
    let group = result.find((g) => g.monthKey === monthKey);
    if (!group) {
      const label = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
        .toUpperCase();
      group = { monthKey, label, dates: [] };
      result.push(group);
    }
    group.dates.push(d);
  }
  return result;
}

function buildCalendarData(dates: CandidateDate[]): CalendarMonthData[] {
  const monthKeys = [...new Set(dates.map((d) => d.date.substring(0, 7)))].sort();
  return monthKeys.map((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const startOffset = (firstDow + 6) % 7; // convert to Mon-first
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const label = new Date(year, month - 1, 1)
      .toLocaleDateString("sv-SE", { month: "long", year: "numeric" })
      .toUpperCase();
    return { monthKey, year, month, label, cells };
  });
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
  const [isFirstSave, setIsFirstSave] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lockedDate, setLockedDate] = useState<{ id: string; date: string } | null>(null);
  const [respondedCount, setRespondedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [savedRespondedCount, setSavedRespondedCount] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [confirmFlash, setConfirmFlash] = useState(false);
  const [bringItems, setBringItems] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/availability/${friendToken}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "INVALID LINK."); return; }
      setFriendName(data.friendName);
      setDates(data.candidateDates);
      setSelected(new Set(data.candidateDates.filter((d: CandidateDate) => d.selected).map((d: CandidateDate) => d.id)));
      const hasExisting = data.candidateDates.some((d: CandidateDate) => d.selected);
      setIsFirstSave(!hasExisting);
      setHasResponded(hasExisting);
      setLockedDate(data.lockedDate ?? null);
      setBringItems(data.bringItems ?? []);
      setRespondedCount(data.respondedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
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

  useEffect(() => {
    if (lockedDate && !loading) playBlip();
  }, [lockedDate?.id, loading]);

  // Glitch flash on the confirmation hero when locked date first appears after boot
  const lockedDateId = lockedDate?.id ?? null;
  useEffect(() => {
    if (!lockedDateId || !booted) return;
    setConfirmFlash(true);
    const t = setTimeout(() => setConfirmFlash(false), 480);
    return () => clearTimeout(t);
  }, [lockedDateId, booted]);

  function selectAll() {
    playClick();
    setSaved(false);
    setSavedRespondedCount(null);
    setSelected(new Set(dates.map((d) => d.id)));
  }

  function clearAll() {
    playClick();
    setSaved(false);
    setSavedRespondedCount(null);
    setSelected(new Set());
  }

  function toggleDate(id: string) {
    setSaved(false);
    setSavedRespondedCount(null);
    const wasSelected = selected.has(id);
    playToggle(!wasSelected);
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
    playClick();
    setSaving(true);
    setError("");
    const wasFirstSave = isFirstSave;
    try {
      const res = await fetch(`/api/availability/${friendToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDateIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        playError();
        setError(data.error || "SAVE FAILED.");
        return;
      }
      if (wasFirstSave) {
        playWelcomeBack();
        setIsFirstSave(false);
        setShowConfirm(true);
        setTimeout(() => setShowConfirm(false), 2200);
      } else {
        playConfirm();
      }
      setSaved(true);
      setHasResponded(true);
      const rc = data.respondedCount ?? (wasFirstSave ? respondedCount + 1 : respondedCount);
      const tc = data.totalCount ?? totalCount;
      setSavedRespondedCount(rc);
      setRespondedCount(rc);
      setTotalCount(tc);
    } catch {
      playError();
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
          <div className="text-[48px] leading-none text-white mb-6">RSA</div>
          <p className="text-red-400 text-xs tracking-widest font-mono border border-red-800/50 px-4 py-3 bg-red-950/20">
            [ACCESS DENIED] {error}
          </p>
        </div>
      </main>
    );
  }

  const dateIndexMap = new Map(dates.map((d, i) => [d.id, i]));
  const monthGroups = groupDatesByMonth(dates);
  const calendarMonths = buildCalendarData(dates);
  const dateByStr = new Map(dates.map((d) => [d.date, d]));

  return (
    <>
      {/* A2 — extra bottom padding so sticky bar doesn't overlap content */}
      <main className={`min-h-screen px-4 pt-12 pb-32 ${booted ? "crt-boot" : "opacity-0"}`}>
        <div className="w-full max-w-lg mx-auto flicker">

          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className="logo-rsa text-[56px] leading-none tracking-tight text-white block mb-2"
              data-text="RSA"
            >
              RSA
            </div>
            <div className="w-full h-px bg-white/20 my-4" />
            <p className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
              RSA INITIERING // STATUSRAPPORT
            </p>
            <h1 className="text-[22px] tracking-[0.2em] text-white uppercase">
              OPERATIVE: {friendName}
            </h1>
            <p className="text-[12px] text-white/55 tracking-widest uppercase mt-1">
              MARKERA VILKA DATUM DU KAN
            </p>
          </div>

          {/* A4 — Persistent response indicator */}
          {hasResponded && !showConfirm && (
            <div className="flex items-center justify-between border border-white/20 px-4 py-2.5 mb-6 bg-white/3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-white/60 shrink-0" />
                <p className="text-[11px] tracking-[0.4em] text-white/50 uppercase font-mono">
                  RAPPORT INLÄMNAD
                </p>
              </div>
              <p className="text-[10px] tracking-[0.3em] text-white/25 uppercase font-mono shrink-0">
                SVAR REGISTRERAT
              </p>
            </div>
          )}

          {/* Mission confirmation hero */}
          {lockedDate && (
            <div className={`border-2 border-white p-6 mb-8 bg-white/5 ${confirmFlash ? "select-glitch" : ""}`}>
              <p className="text-[10px] tracking-[0.6em] text-white/40 uppercase font-mono mb-5">
                ■ MISSION BEKRÄFTAD // DATUM FASTSTÄLLT
              </p>
              <p className="text-[clamp(18px,4vw,28px)] tracking-[0.12em] text-white uppercase leading-tight mb-5">
                {formatDateLabel(lockedDate.date)}
              </p>
              {bringItems.length > 0 && (
                <>
                  <div className="h-px bg-white/10 mb-4" />
                  <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mb-2">
                    TA MED
                  </p>
                  <div className="space-y-1 mb-4">
                    {bringItems.map((item, i) => (
                      <p key={i} className="text-[12px] tracking-[0.1em] text-white/80 uppercase font-mono">
                        • {item}
                      </p>
                    ))}
                  </div>
                </>
              )}
              <div className="h-px bg-white/15 mb-4" />
              {!hasResponded ? (
                <p className="text-[11px] tracking-[0.4em] text-white/40 uppercase font-mono">
                  DITT SVAR SAKNAS — UPPDATERA NEDAN
                </p>
              ) : selected.has(lockedDate.id) ? (
                <p className="text-[11px] tracking-[0.4em] text-white/70 uppercase font-mono">
                  ■ DU ÄR TILLGÄNGLIG DETTA DATUM
                </p>
              ) : (
                <p className="text-[11px] tracking-[0.4em] text-red-400/60 uppercase font-mono">
                  ■ DATUM KONFLIKTAR MED DITT SVAR
                </p>
              )}
            </div>
          )}

          {/* Controls row: B2 view toggle + select all/clear */}
          {dates.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { playClick(); setViewMode("list"); }}
                  className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-all duration-100
                    ${viewMode === "list" ? "border-white text-white" : "border-white/20 text-white/30 hover:border-white/40 hover:text-white/50"}`}
                >
                  LISTA
                </button>
                <button
                  type="button"
                  onClick={() => { playClick(); setViewMode("calendar"); }}
                  className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-all duration-100
                    ${viewMode === "calendar" ? "border-white text-white" : "border-white/20 text-white/30 hover:border-white/40 hover:text-white/50"}`}
                >
                  KALENDER
                </button>
              </div>
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] tracking-[0.35em] text-white/30 hover:text-white/70 uppercase transition-colors duration-100"
                >
                  [VÄLJ ALLA]
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] tracking-[0.35em] text-white/30 hover:text-white/70 uppercase transition-colors duration-100"
                >
                  [RENSA]
                </button>
              </div>
            </div>
          )}

          {/* Date selection area */}
          {dates.length === 0 ? (
            <p className="text-white/50 text-xs tracking-widest font-mono text-center py-8 border border-white/10">
              INGA DATUM TILLGÄNGLIGA
            </p>
          ) : viewMode === "list" ? (
            /* List view */
            <div className="space-y-6">
              {monthGroups.map((group) => (
                <div key={group.monthKey}>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-[11px] tracking-[0.4em] text-white/40 uppercase font-mono">
                      {group.label}
                    </span>
                    <span className="text-[10px] tracking-[0.3em] text-white/20 uppercase font-mono">
                      // {group.dates.length} DATUM
                    </span>
                  </div>
                  <div className="space-y-px">
                    {group.dates.map((d) => {
                      const globalIndex = dateIndexMap.get(d.id) ?? 0;
                      const isSelected = selected.has(d.id);
                      const isGlitching = glitchingId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          data-date-index={globalIndex}
                          onClick={() => toggleDate(d.id)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              (document.querySelector(`[data-date-index="${globalIndex + 1}"]`) as HTMLElement)?.focus();
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              (document.querySelector(`[data-date-index="${globalIndex - 1}"]`) as HTMLElement)?.focus();
                            }
                          }}
                          className={`w-full flex items-center justify-between px-5 py-4 border text-left transition-all duration-75 group
                            ${isGlitching ? "select-glitch" : ""}
                            ${isSelected
                              ? "bg-white border-white text-black"
                              : "bg-black border-white/20 text-white hover:border-white/60"
                            }
                          `}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className={`text-[12px] font-mono shrink-0 w-5 text-right
                              ${isSelected ? "text-black/40" : "text-white/40"}`}
                            >
                              {String(globalIndex + 1).padStart(2, "0")}
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
                </div>
              ))}
            </div>
          ) : (
            /* B2 — Calendar grid view */
            <div className="space-y-8">
              {calendarMonths.map((cm) => (
                <div key={cm.monthKey}>
                  <p className="text-[11px] tracking-[0.4em] text-white/40 uppercase font-mono mb-3">
                    {cm.label}
                  </p>
                  <div className="grid grid-cols-7 gap-px">
                    {SW_DAYS.map((d) => (
                      <div
                        key={d}
                        className="text-[9px] tracking-[0.15em] text-white/25 uppercase font-mono text-center pb-2"
                      >
                        {d}
                      </div>
                    ))}
                    {cm.cells.map((dayNum, i) => {
                      if (!dayNum) return <div key={i} className="aspect-square" />;
                      const dateStr = `${cm.year}-${String(cm.month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const candidate = dateByStr.get(dateStr);
                      const isSelected = candidate ? selected.has(candidate.id) : false;
                      const isGlitching = candidate ? glitchingId === candidate.id : false;
                      return (
                        <button
                          key={i}
                          type="button"
                          title={candidate ? formatDateLabel(candidate.date) : undefined}
                          onClick={() => candidate && toggleDate(candidate.id)}
                          disabled={!candidate}
                          className={`aspect-square flex items-center justify-center text-[13px] font-mono transition-all duration-75
                            ${isGlitching ? "select-glitch" : ""}
                            ${candidate
                              ? isSelected
                                ? "bg-white text-black"
                                : "border border-white/35 text-white hover:border-white hover:bg-white/10"
                              : "text-white/12 pointer-events-none"
                            }
                          `}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected count */}
          {dates.length > 0 && (
            <p className="text-[13px] tracking-[0.35em] text-white/40 uppercase font-mono mt-4">
              {selected.size === 0
                ? "INGA DATUM VALDA"
                : `${selected.size} DATUM MARKERADE // ${dates.length - selected.size} AVBÖJDA`
              }
            </p>
          )}

          {error && (
            <p className="text-red-400 text-[12px] tracking-widest font-mono border border-red-800/50 px-3 py-2 bg-red-950/20 mt-5">
              [ERR] {error}
            </p>
          )}

          {/* Social signal after save */}
          {saved && !showConfirm && (
            <div className="border border-white/30 text-white text-[12px] tracking-[0.3em] uppercase font-mono px-5 py-4 mt-5 bg-white/5 space-y-1">
              <p>[OK] TILLGÄNGLIGHET SPARAD.</p>
              {savedRespondedCount !== null && totalCount > 0 && (
                <p className="text-white/40">
                  {savedRespondedCount}/{totalCount} OPERATIVE{totalCount !== 1 ? "S" : ""} HAR SVARAT
                </p>
              )}
            </div>
          )}

          <p className="mt-8 text-[13px] tracking-[0.3em] text-white/12 uppercase font-mono text-center">
            RSA SER ALLT // DETTA FORMULÄR ÄR PERSONLIGT
          </p>
        </div>
      </main>

      {/* A2 — Sticky save bar */}
      {dates.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-white/20 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <p className="text-[11px] tracking-[0.3em] text-white/35 uppercase font-mono flex-1 truncate">
              {selected.size === 0
                ? "INGA DATUM VALDA"
                : `${selected.size} / ${dates.length} DATUM VALDA`
              }
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn-rsa shrink-0 border-2 uppercase tracking-[0.35em] px-8 py-3 font-bold transition-all duration-100
                disabled:opacity-30 disabled:cursor-not-allowed
                ${saved && !saving
                  ? "border-white/35 text-white/35 hover:border-white hover:text-white"
                  : "border-white text-white hover:bg-white hover:text-black"
                }`}
              style={{ fontSize: "12px" }}
            >
              {saving
                ? <span className="cursor-blink">_</span>
                : saved
                  ? "■ SPARAT"
                  : "BEKRÄFTA"
              }
            </button>
          </div>
        </div>
      )}

      {/* First-confirmation overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9990] bg-black flex flex-col items-center justify-center overlay-enter">
          <div className="text-center px-8 flicker">
            <div
              className="logo-rsa text-[clamp(56px,12vw,96px)] leading-none tracking-tight text-white block mb-2"
              data-text="RSA"
            >
              RSA
            </div>
            <div className="w-full h-px bg-white/30 my-6" />
            <p className="text-[11px] tracking-[0.5em] text-white/40 uppercase mb-4">
              RAPPORT MOTTAGEN // TILLGÄNGLIGHET REGISTRERAD
            </p>
            <h2 className="text-[clamp(22px,6vw,44px)] tracking-[0.25em] text-white uppercase mb-3">
              <GlitchText text="BEKRÄFTAD" delay={300} speed={28} />
            </h2>
            <p className="text-[clamp(14px,3vw,22px)] tracking-[0.35em] text-white/60 uppercase font-mono mb-6">
              {friendName}
            </p>
            <div className="w-full h-px bg-white/20 mb-6" />
            <p className="text-[12px] tracking-[0.4em] text-white/40 uppercase font-mono">
              DITT SVAR ÄR SPARAT<span className="cursor-blink">_</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
