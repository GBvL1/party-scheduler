"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { GlitchText } from "@/app/components/GlitchText";
import { playClick, playConfirm, playBlip, playWelcomeBack } from "@/lib/sound";

type Friend = { id: string; name: string; token: string; hasResponded: boolean };
type DateEntry = { id: string; date: string; availableFriends: string[] };
type ViewMode = "list" | "matrix";
type DashboardPhase = "empty" | "collecting" | "locked";

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function formatDateMicro(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    month: "short",
    day: "numeric",
  }).toUpperCase().replace(".", "");
}

function getRecommendation(
  sortedDates: DateEntry[],
  maxResponders: number,
  lockedDateId: string | null
): string | null {
  if (lockedDateId || sortedDates.length === 0 || maxResponders === 0) return null;
  const topCount = sortedDates[0].availableFriends.length;
  if (topCount === 0) return null;

  const tied = sortedDates.filter((d) => d.availableFriends.length === topCount);
  if (tied.length > 1) {
    return `DELAD TOPP — ${tied.length} DATUM MED ${topCount}/${maxResponders} SVAR`;
  }
  if (topCount === maxResponders) {
    return `ALLA ${maxResponders} TILLGÄNGLIGA — PERFEKT MATCH`;
  }
  if (topCount === maxResponders - 1 && maxResponders > 2) {
    return `NÄSTAN PERFEKT — ${topCount}/${maxResponders} — 1 OPERATIVE SAKNAS`;
  }
  return `REKOMMENDERAT — ${topCount}/${maxResponders} TILLGÄNGLIGA`;
}

export default function DashboardPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const [eventName, setEventName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [lockedDateId, setLockedDateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [missionToken, setMissionToken] = useState<string | null>(null);
  const [lockingDateId, setLockingDateId] = useState<string | null>(null);
  const [showLockOverlay, setShowLockOverlay] = useState(false);
  const [glitchingDateIds, setGlitchingDateIds] = useState<Set<string>>(new Set());
  const [pollCountdown, setPollCountdown] = useState(15);
  const [newDataFlash, setNewDataFlash] = useState(false);
  const [newDataBanner, setNewDataBanner] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const prevDatesRef = useRef<DateEntry[]>([]);

  const applyData = useCallback((data: any, silent: boolean) => {
    if (!silent) {
      setEventName(data.eventName);
      setLocation(data.location ?? null);
      setLocationInput(data.location ?? "");
    }

    if (silent && prevDatesRef.current.length > 0) {
      const prevMap = new Map(prevDatesRef.current.map((d) => [d.id, d.availableFriends.length]));
      const changed = new Set<string>();
      for (const d of data.dates ?? []) {
        if (prevMap.get(d.id) !== d.availableFriends.length) changed.add(d.id);
      }
      if (changed.size > 0) {
        playBlip();
        setGlitchingDateIds(changed);
        setTimeout(() => setGlitchingDateIds(new Set()), 500);
      }
    }

    setFriends(data.friends ?? []);
    setDates(data.dates ?? []);
    setLockedDateId(data.lockedDateId ?? null);
    setMissionToken(data.missionToken ?? null);
    prevDatesRef.current = data.dates ?? [];
  }, []);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/dashboard/${hostToken}`);
      const data = await res.json();
      if (!res.ok) {
        if (!silent) setError(data.error || "FAILED TO LOAD.");
        return;
      }

      if (silent) {
        const prevTotal = prevDatesRef.current.reduce((s, d) => s + d.availableFriends.length, 0);
        const newTotal = (data.dates ?? []).reduce((s: number, d: any) => s + d.availableFriends.length, 0);
        const hasChanges = prevTotal !== newTotal || prevDatesRef.current.length !== (data.dates ?? []).length;
        setPollCountdown(15);
        applyData(data, true);
        if (hasChanges) {
          setNewDataFlash(true);
          setNewDataBanner(true);
          setTimeout(() => setNewDataFlash(false), 1800);
          setTimeout(() => setNewDataBanner(false), 4000);
        }
      } else {
        applyData(data, false);
      }
    } catch {
      if (!silent) setError("NETWORK ERROR.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [hostToken, applyData]);

  useEffect(() => { fetchDashboard(false); }, [fetchDashboard]);

  useEffect(() => {
    const id = setInterval(() => fetchDashboard(true), 15000);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  useEffect(() => {
    const id = setInterval(() => setPollCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && !error) {
      localStorage.setItem("rsa_host_token", hostToken);
    }
  }, [loading, error, hostToken]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setBooted(true), 40);
      return () => clearTimeout(t);
    }
  }, [loading]);

  async function lockDate(dateId: string | null) {
    playClick();
    try {
      const res = await fetch(`/api/dashboard/${hostToken}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateId }),
      });
      if (!res.ok) return;
      setLockedDateId(dateId);
      setLockingDateId(null);
      if (dateId) {
        playWelcomeBack();
        setShowLockOverlay(true);
        setTimeout(() => setShowLockOverlay(false), 2800);
      }
    } catch {}
  }

  async function saveLocation() {
    setLocationSaving(true);
    try {
      const res = await fetch(`/api/dashboard/${hostToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationInput }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setLocation(data.location ?? null);
      setLocationEditing(false);
      playConfirm();
    } catch {
    } finally {
      setLocationSaving(false);
    }
  }

  function getJoinLink() {
    return `${window.location.origin}/join/${hostToken}`;
  }

  function getDashboardLink() {
    return window.location.href;
  }

  function getMissionLink() {
    return `${window.location.origin}/mission/${missionToken}`;
  }

  function getDeadDropLink() {
    return `${window.location.origin}/dead-drop/${missionToken}`;
  }

  async function copyText(text: string, key: string) {
    playClick();
    await navigator.clipboard.writeText(text);
    playConfirm();
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function buildShareMessage(dateId: string) {
    const entry = dates.find((d) => d.id === dateId);
    if (!entry) return "";
    const countLine = maxResponders > 0
      ? `${entry.availableFriends.length}/${maxResponders} OPERATIVE${maxResponders !== 1 ? "S" : ""} BEKRÄFTADE`
      : "";
    const lines = [
      "RSA INITIERING // DATUM BEKRÄFTAT",
      "",
      formatDateLabel(entry.date),
      ...(location ? [`KOORDINATER: ${location}`] : []),
      ...(countLine ? [countLine] : []),
      "",
      "// RSA SER ALLT",
    ];
    return lines.join("\n");
  }

  function buildNudgeMessage() {
    const names = missingFriends.map((f) => `• ${f.name}`).join("\n");
    return `RSA INITIERING // UPPDRAGSPÅMINNELSE\n\nFÖLJANDE OPERATIVES HAR EJ RAPPORTERAT IN:\n${names}\n\nRAPPORTERA IN VIA:\n${getJoinLink()}\n\n// RSA SER ALLT`;
  }

  const maxResponders = friends.length;
  const respondedCount = friends.filter((f) => f.hasResponded).length;
  const missingFriends = friends.filter((f) => !f.hasResponded);
  const sortedDates = [...dates].sort((a, b) => b.availableFriends.length - a.availableFriends.length);
  const lockedDate = lockedDateId ? dates.find((d) => d.id === lockedDateId) : null;
  const recommendation = getRecommendation(sortedDates, maxResponders, lockedDateId);

  const top3DateIds = new Set(
    sortedDates.filter((d) => d.availableFriends.length > 0).slice(0, 3).map((d) => d.id)
  );

  // A1 — phase drives section ordering and emphasis
  const phase: DashboardPhase = lockedDateId
    ? "locked"
    : respondedCount === 0
      ? "empty"
      : "collecting";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 text-xs tracking-[0.4em] uppercase font-mono">
          LADDAR INTEL <span className="cursor-blink">_</span>
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-400 text-xs tracking-widest font-mono border border-red-800/50 px-4 py-3 bg-red-950/20">
          [ACCESS DENIED] {error}
        </p>
      </main>
    );
  }

  return (
    <>
      <main className={`min-h-screen px-4 py-12 ${booted ? "crt-boot" : "opacity-0"}`}>
        <div className="max-w-3xl mx-auto space-y-8 flicker">

          {/* HEADER */}
          <div className="border-b border-white/20 pb-8 text-center">
            <div
              className="logo-rsa text-[64px] leading-none tracking-tight text-white block mb-2"
              data-text="RSA"
            >
              RSA
            </div>
            <p className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
              RSA INITIERING // FÄLTKOMMANDOCENTRAL
            </p>
            <h1 className="text-[28px] tracking-[0.25em] text-white uppercase">
              {eventName}
            </h1>
            <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
              <span className="text-[12px] tracking-widest text-white/50 uppercase">
                {maxResponders} OPERATIVE{maxResponders !== 1 ? "S" : ""}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[12px] tracking-widest text-white/50 uppercase">
                {respondedCount}/{maxResponders} SVAR
              </span>
              {lockedDateId && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-[12px] tracking-widest text-white uppercase">
                    ■ LOCKED
                  </span>
                </>
              )}
              <span className="text-white/20">·</span>
              <span className={`text-[10px] tracking-[0.3em] font-mono uppercase transition-colors duration-300
                ${newDataFlash ? "text-white" : "text-white/20"}`}
              >
                {newDataFlash ? "■ NYTT INTEL" : `■ LIVE // ${pollCountdown}s`}
              </span>
            </div>
          </div>

          {/* A1 — Empty phase: join link hero surfaces above everything */}
          {phase === "empty" && (
            <div className="border-2 border-white/50 p-6 bg-white/3">
              <p className="text-[10px] tracking-[0.5em] text-white/40 uppercase font-mono mb-3">
                STEG 1 // REKRYTERA OPERATIVES
              </p>
              <h2 className="text-[18px] tracking-[0.2em] text-white uppercase mb-2">
                DELA REKRYTERINGSLÄNKEN
              </h2>
              <p className="text-[12px] tracking-[0.25em] text-white/40 uppercase font-mono mb-4">
                DELA MED ALLA OPERATIVES. DE REGISTRERAR SINA EGNA NAMN.
              </p>
              <div className="flex items-stretch gap-0">
                <code className="flex-1 bg-white/5 border border-white/15 px-3 py-3 text-[12px] text-white/40 font-mono tracking-wider truncate">
                  {typeof window !== "undefined" ? getJoinLink() : ""}
                </code>
                <button
                  onClick={() => copyText(getJoinLink(), "join")}
                  className="shrink-0 border-2 border-white text-white text-[12px] tracking-[0.3em] uppercase font-mono px-5 hover:bg-white hover:text-black transition-all duration-100"
                >
                  {copied === "join" ? "KOPIERAT" : "KOPIERA"}
                </button>
              </div>
            </div>
          )}

          {/* LOCKED DATE BANNER */}
          {lockedDate && (
            <div className="border-2 border-white p-5 bg-white/5">
              <p className="text-[11px] tracking-[0.5em] text-white/50 uppercase mb-2">
                OPERATION LOCKED // DATUM BEKRÄFTAT
              </p>
              <h2 className="text-[clamp(14px,2.5vw,22px)] tracking-[0.2em] text-white uppercase mb-1">
                {formatDateLabel(lockedDate.date)}
              </h2>
              <p className="text-[12px] tracking-widest text-white/40 font-mono mb-4 uppercase">
                {lockedDate.availableFriends.length}/{maxResponders} TILLGÄNGLIGA
                {lockedDate.availableFriends.length > 0 && (
                  <> // {lockedDate.availableFriends.join(" · ")}</>
                )}
              </p>
              <pre className="bg-black border border-white/15 px-4 py-3 text-[11px] text-white/40 font-mono tracking-wider mb-4 whitespace-pre-wrap break-words">
                {buildShareMessage(lockedDate.id)}
              </pre>
              <div className="flex items-center gap-5 flex-wrap">
                <button
                  onClick={() => copyText(buildShareMessage(lockedDate.id), "share")}
                  className="btn-rsa border-2 border-white text-white uppercase tracking-[0.3em] px-6 py-2 text-[12px] font-bold hover:bg-white hover:text-black"
                >
                  {copied === "share" ? "KOPIERAT" : "KOPIERA KALLELSE"}
                </button>
                {missionToken && (
                  <button
                    onClick={() => copyText(getMissionLink(), "mission")}
                    className="btn-rsa border border-white/50 text-white/70 uppercase tracking-[0.3em] px-6 py-2 text-[12px] font-bold hover:border-white hover:text-white transition-all duration-100"
                  >
                    {copied === "mission" ? "KOPIERAT" : "KOPIERA UPPDRAGSLÄNK"}
                  </button>
                )}
                {missionToken && (
                  <button
                    onClick={() => copyText(getDeadDropLink(), "deadDrop")}
                    className="btn-rsa border border-white/30 text-white/45 uppercase tracking-[0.3em] px-6 py-2 text-[12px] font-bold hover:border-white/60 hover:text-white/70 transition-all duration-100"
                  >
                    {copied === "deadDrop" ? "KOPIERAT" : "KOPIERA DEAD DROP"}
                  </button>
                )}
                <button
                  onClick={() => lockDate(null)}
                  className="text-[11px] tracking-[0.35em] text-white/30 hover:text-white/60 uppercase underline underline-offset-4 transition-colors duration-100"
                >
                  LÅS UPP
                </button>
              </div>
            </div>
          )}

          {/* KOORDINATER — shown when date is locked */}
          {lockedDate && (
            <div className="border border-white/20 p-5">
              <h2 className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
                KOORDINATER
              </h2>
              <p className="text-[13px] tracking-[0.25em] text-white/30 uppercase font-mono mb-4">
                MÖTESPLATS. VISAS VIA DEAD DROP OCH KALLELSE.
              </p>
              {location !== null && !locationEditing ? (
                <div className="flex items-center gap-0">
                  <code className="flex-1 bg-white/5 border border-white/15 px-3 py-3 text-[12px] text-white/60 font-mono tracking-wider truncate">
                    {location}
                  </code>
                  <button
                    onClick={() => { playClick(); setLocationEditing(true); }}
                    className="shrink-0 border border-white/30 text-white/40 text-[11px] tracking-[0.3em] uppercase font-mono px-4 py-3 hover:border-white hover:text-white transition-all duration-100"
                  >
                    ÄNDRA
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-stretch gap-0">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLocation();
                        if (e.key === "Escape" && location !== null) { setLocationEditing(false); setLocationInput(location); }
                      }}
                      placeholder="T.EX. LAGERLOKAL 7, HAMNGATAN 4"
                      className="flex-1 bg-white/5 border border-white/15 px-3 py-3 text-[12px] text-white/70 font-mono tracking-wider placeholder:text-white/20 outline-none focus:border-white/40"
                    />
                    <button
                      onClick={saveLocation}
                      disabled={locationSaving || !locationInput.trim()}
                      className="shrink-0 border-2 border-white text-white text-[12px] tracking-[0.3em] uppercase font-mono px-5 hover:bg-white hover:text-black transition-all duration-100 disabled:opacity-30"
                    >
                      {locationSaving ? <span className="cursor-blink">_</span> : "SPARA"}
                    </button>
                  </div>
                  {location !== null && (
                    <button
                      onClick={() => { setLocationEditing(false); setLocationInput(location); }}
                      className="text-[10px] tracking-[0.3em] text-white/25 hover:text-white/50 uppercase font-mono underline underline-offset-4 transition-colors duration-100"
                    >
                      AVBRYT
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INTEL RAPPORT */}
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="text-[13px] tracking-[0.4em] text-white/50 uppercase">
                INTEL RAPPORT // TILLGÄNGLIGHET
              </h2>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { playClick(); setViewMode("list"); }}
                  className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-all duration-100
                    ${viewMode === "list" ? "border-white text-white" : "border-white/20 text-white/30 hover:border-white/40 hover:text-white/50"}`}
                >
                  LISTA
                </button>
                <button
                  onClick={() => { playClick(); setViewMode("matrix"); }}
                  className={`text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border transition-all duration-100
                    ${viewMode === "matrix" ? "border-white text-white" : "border-white/20 text-white/30 hover:border-white/40 hover:text-white/50"}`}
                >
                  GRID
                </button>
              </div>
            </div>

            {/* B1 — Smart recommendation in highlighted block */}
            {recommendation && (
              <div className="border border-white/40 bg-white/5 px-5 py-4 mb-5">
                <p className="text-[10px] tracking-[0.5em] text-white/40 uppercase font-mono mb-2">
                  ■ INTEL ANALYS
                </p>
                <p className="text-[14px] tracking-[0.15em] text-white uppercase font-mono">
                  {recommendation}
                </p>
              </div>
            )}

            {/* B3 — New-response notification banner */}
            {newDataBanner && (
              <div className="border border-white/60 bg-white/5 px-5 py-3 mb-4 text-center">
                <p className="text-[11px] tracking-[0.5em] text-white uppercase font-mono">
                  ■ INKOMMANDE INTEL // NY RAPPORT MOTTAGEN
                </p>
              </div>
            )}

            {dates.length === 0 ? (
              <p className="text-white/40 text-[12px] tracking-widest uppercase font-mono text-center py-8 border border-white/10">
                {phase === "empty"
                  ? "INGA SVAR ÄNNU — VÄNTAR PÅ OPERATIVES"
                  : "INGA SVAR ÄNNU"
                }
              </p>
            ) : viewMode === "list" ? (
              <div className="space-y-px">
                {sortedDates.map((d, i) => {
                  const count = d.availableFriends.length;
                  const pct = maxResponders > 0 ? (count / maxResponders) * 100 : 0;
                  const isTop = i === 0 && count > 0 && !lockedDateId;
                  const isLocked = d.id === lockedDateId;
                  const isGlitching = glitchingDateIds.has(d.id);
                  const isDimmed = !!lockedDateId && !isLocked;
                  const showLasAlways = !lockedDateId && count > 0 && top3DateIds.has(d.id);
                  const showLasHover = !lockedDateId && count > 0 && !top3DateIds.has(d.id);

                  return (
                    <div
                      key={d.id}
                      className={`border px-5 py-4 group relative transition-opacity duration-300
                        ${isGlitching ? "select-glitch" : ""}
                        ${isLocked ? "border-white bg-white/8" : isTop ? "border-white/60 bg-white/3" : "border-white/15"}
                        ${isDimmed ? "opacity-40" : ""}
                      `}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <span className={`text-[12px] font-mono shrink-0 w-5 text-right mt-0.5
                            ${isLocked || isTop ? "text-white/50" : "text-white/30"}`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-[13px] tracking-[0.15em] uppercase font-mono
                              ${isLocked || isTop ? "text-white" : "text-white/50"}`}
                            >
                              {formatDateLabel(d.date)}
                            </p>
                            {d.availableFriends.length > 0 ? (
                              <p className="text-[12px] tracking-widest text-white/40 uppercase font-mono mt-1">
                                {d.availableFriends.join(" // ")}
                              </p>
                            ) : (
                              <p className="text-[12px] tracking-widest text-white/15 uppercase font-mono mt-1 italic">
                                INGA SVAR
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right flex items-center gap-3">
                          <div>
                            <span className={`text-2xl font-bold tracking-tight
                              ${isLocked || isTop ? "text-white" : "text-white/40"}`}
                            >
                              {count}
                            </span>
                            <span className="text-[12px] text-white/25 font-mono">
                              /{maxResponders}
                            </span>
                          </div>
                          {showLasAlways && (
                            <button
                              onClick={() => { playClick(); setLockingDateId(d.id); }}
                              className="text-[10px] tracking-[0.25em] text-white/25 hover:text-white uppercase font-mono transition-colors duration-150 shrink-0 border border-white/15 hover:border-white/60 px-2 py-1"
                            >
                              LÅS
                            </button>
                          )}
                          {showLasHover && (
                            <button
                              onClick={() => { playClick(); setLockingDateId(d.id); }}
                              className="text-[10px] tracking-[0.25em] text-white/0 group-hover:text-white/25 hover:!text-white uppercase font-mono transition-colors duration-150 shrink-0 border border-transparent group-hover:border-white/10 hover:!border-white/50 px-2 py-1"
                            >
                              LÅS
                            </button>
                          )}
                          {isLocked && (
                            <span className="text-[10px] tracking-[0.25em] text-white uppercase font-mono border border-white/40 px-2 py-1 shrink-0">
                              LÅST
                            </span>
                          )}
                        </div>
                      </div>

                      {maxResponders > 0 && (
                        <div className="mt-3 h-0.5 bg-white/8">
                          <div
                            className={`h-full transition-all duration-500 ${isLocked ? "bg-white" : "bg-white/60"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MATRIX / GRID VIEW */
              <div className="overflow-x-auto">
                <table className="text-left border-collapse" style={{ minWidth: `${180 + sortedDates.length * 52}px` }}>
                  <thead>
                    <tr>
                      <th className="text-[10px] tracking-widest text-white/30 uppercase font-mono pb-3 pr-4 w-36 font-normal">
                        OPERATIVE
                      </th>
                      {sortedDates.map((d) => (
                        <th key={d.id} className="pb-3 px-1 font-normal">
                          <div className={`text-[9px] tracking-wider uppercase font-mono text-center leading-tight
                            ${d.id === lockedDateId ? "text-white" : "text-white/30"}`}
                          >
                            {formatDateMicro(d.date)}
                          </div>
                        </th>
                      ))}
                      <th className="text-[10px] tracking-widest text-white/30 uppercase font-mono pb-3 pl-4 font-normal text-right">
                        ∑
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {friends.map((f) => {
                      const friendTotal = sortedDates.filter((d) => d.availableFriends.includes(f.name)).length;
                      return (
                        <tr key={f.id} className="border-t border-white/8">
                          <td className={`text-[11px] tracking-[0.12em] uppercase font-mono py-2.5 pr-4
                            ${f.hasResponded ? "text-white/50" : "text-white/20"}`}
                          >
                            {f.name}
                          </td>
                          {sortedDates.map((d) => {
                            const available = d.availableFriends.includes(f.name);
                            const isLockedCol = d.id === lockedDateId;
                            return (
                              <td key={d.id} className="py-2.5 px-1 text-center">
                                <div className={`w-5 h-5 mx-auto border transition-colors duration-200
                                  ${available
                                    ? isLockedCol ? "bg-white border-white" : "bg-white/65 border-white/65"
                                    : isLockedCol ? "border-white/30 bg-white/5" : "border-white/10"
                                  }`}
                                />
                              </td>
                            );
                          })}
                          <td className={`text-[11px] font-mono font-bold py-2.5 pl-4 text-right
                            ${f.hasResponded ? "text-white/50" : "text-white/15"}`}
                          >
                            {f.hasResponded ? friendTotal : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-white/20">
                      <td className="text-[10px] tracking-widest text-white/30 uppercase font-mono py-3 pr-4">
                        TOTAL
                      </td>
                      {sortedDates.map((d) => (
                        <td key={d.id} className="py-3 px-1 text-center">
                          <span className={`text-[12px] font-mono font-bold
                            ${d.id === lockedDateId ? "text-white" : "text-white/40"}`}
                          >
                            {d.availableFriends.length}
                          </span>
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REGISTRERADE OPERATIVES */}
          {friends.length > 0 && (
            <div className="border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h2 className="text-[13px] tracking-[0.4em] text-white/50 uppercase">
                  OPERATIVES ({friends.length})
                </h2>
                {/* C3 — nudge copy + missing count */}
                <div className="flex items-center gap-4 shrink-0">
                  {missingFriends.length > 0 && (
                    <>
                      <span className="text-[10px] tracking-[0.3em] text-red-400/60 uppercase font-mono">
                        {missingFriends.length} AVVAKTAR
                      </span>
                      <button
                        onClick={() => copyText(buildNudgeMessage(), "nudge")}
                        className="text-[10px] tracking-[0.3em] text-white/30 hover:text-white/70 uppercase font-mono underline underline-offset-4 transition-colors duration-100"
                      >
                        {copied === "nudge" ? "KOPIERAT" : "KOPIERA PÅMINNELSE"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-px">
                {friends.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-4 py-2 border-b border-white/5">
                    <span className="text-[13px] font-mono text-white/30 w-5 text-right shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-xs tracking-[0.2em] uppercase font-mono flex-1
                      ${f.hasResponded ? "text-white/50" : "text-white/20"}`}
                    >
                      {f.name}
                    </span>
                    {!f.hasResponded && (
                      <span className="text-[10px] tracking-[0.3em] text-red-400/50 uppercase font-mono shrink-0">
                        AVVAKTAR
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOGISTICS */}
          <div className="space-y-4">
            {/* A1 — join link shown at bottom only in non-empty phases (shown at top in empty phase) */}
            {phase !== "empty" && (
              <div className="border border-white/20 p-5">
                <h2 className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
                  DEPLOYMENT LINK
                </h2>
                <p className="text-[13px] tracking-[0.25em] text-white/30 uppercase font-mono mb-4">
                  DELA DENNA LÄNK MED ALLA OPERATIVES. DE REGISTRERAR SINA EGNA NAMN.
                </p>
                <div className="flex items-stretch gap-0">
                  <code className="flex-1 bg-white/5 border border-white/15 px-3 py-3 text-[12px] text-white/40 font-mono tracking-wider truncate">
                    {typeof window !== "undefined" ? getJoinLink() : ""}
                  </code>
                  <button
                    onClick={() => copyText(getJoinLink(), "join")}
                    className="shrink-0 border-2 border-white text-white text-[12px] tracking-[0.3em] uppercase font-mono px-5 hover:bg-white hover:text-black transition-all duration-100"
                  >
                    {copied === "join" ? "KOPIERAT" : "KOPIERA"}
                  </button>
                </div>
              </div>
            )}

            <div className="border border-white/10 p-5">
              <h2 className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
                DIN KOMMANDOLÄNK
              </h2>
              <p className="text-[13px] tracking-[0.25em] text-white/30 uppercase font-mono mb-4">
                BOKMÄRK DENNA LÄNK. UTAN DEN FÖRLORAR DU ÅTKOMST.
              </p>
              <div className="flex items-stretch gap-0">
                <code className="flex-1 bg-white/3 border border-white/10 px-3 py-3 text-[12px] text-white/30 font-mono tracking-wider truncate">
                  {typeof window !== "undefined" ? getDashboardLink() : ""}
                </code>
                <button
                  onClick={() => copyText(getDashboardLink(), "dashboard")}
                  className="shrink-0 border border-white/30 text-white/40 text-[12px] tracking-[0.3em] uppercase font-mono px-5 hover:border-white hover:text-white transition-all duration-100"
                >
                  {copied === "dashboard" ? "KOPIERAT" : "KOPIERA"}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[13px] tracking-[0.3em] text-white/10 uppercase font-mono text-center pb-4">
            RSA SER ALLT // KLASSIFICERAT // {new Date().getFullYear()}
          </p>
        </div>
      </main>

      {/* LOCK CONFIRMATION OVERLAY */}
      {lockingDateId && (
        <div className="fixed inset-0 z-[9990] bg-black flex items-center justify-center p-6">
          <div className="border border-white/30 p-8 max-w-sm w-full text-center bg-black">
            <p className="text-[11px] tracking-[0.5em] text-white/40 uppercase mb-5">
              BEKRÄFTA // LÅS DATUM
            </p>
            <p className="text-[clamp(13px,2.5vw,18px)] tracking-[0.2em] text-white uppercase mb-8 font-mono">
              {formatDateLabel(dates.find((d) => d.id === lockingDateId)?.date ?? "")}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => lockDate(lockingDateId)}
                className="btn-rsa border-2 border-white text-white uppercase tracking-[0.35em] px-8 py-3 text-[13px] font-bold hover:bg-white hover:text-black"
              >
                BEKRÄFTA
              </button>
              <button
                onClick={() => { playClick(); setLockingDateId(null); }}
                className="text-[13px] tracking-[0.3em] text-white/30 hover:text-white/70 uppercase transition-colors"
              >
                AVBRYT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATION LOCKED OVERLAY */}
      {showLockOverlay && lockedDate && (
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
              OPERATION LOCKED // DATUM BEKRÄFTAT
            </p>
            <h2 className="text-[clamp(14px,3vw,26px)] tracking-[0.2em] text-white uppercase mb-3">
              <GlitchText text={formatDateLabel(lockedDate.date)} delay={300} speed={22} />
            </h2>
            <div className="w-full h-px bg-white/20 mb-6" />
            <p className="text-[12px] tracking-[0.4em] text-white/40 uppercase font-mono">
              KALLELSE KLAR ATT SKICKAS<span className="cursor-blink">_</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
