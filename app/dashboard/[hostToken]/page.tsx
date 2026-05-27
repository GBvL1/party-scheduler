"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type Friend = { id: string; name: string; token: string };
type DateEntry = { id: string; date: string; availableFriends: string[] };

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

export default function DashboardPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const [eventName, setEventName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/${hostToken}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "FAILED TO LOAD."); return; }
      setEventName(data.eventName);
      setFriends(data.friends);
      setDates(data.dates);
    } catch {
      setError("NETWORK ERROR.");
    } finally {
      setLoading(false);
    }
  }, [hostToken]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setBooted(true), 40);
      return () => clearTimeout(t);
    }
  }, [loading]);

  function getJoinLink() {
    return `${window.location.origin}/join/${hostToken}`;
  }

  function getDashboardLink() {
    return window.location.href;
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const maxResponders = friends.length;

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

  const sortedDates = [...dates].sort((a, b) => b.availableFriends.length - a.availableFriends.length);

  return (
    <main className={`min-h-screen px-4 py-12 ${booted ? "crt-boot" : "opacity-0"}`}>
      <div className="max-w-3xl mx-auto space-y-8 flicker">

        {/* Header */}
        <div className="border-b border-white/20 pb-8 text-center">
          <div
            className="logo-rsa text-[64px] leading-none tracking-tight text-white block mb-2"
            data-text="RSA"
          >
            RSA
          </div>
          <p className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1">
            RSA INITIATION // FÄLTKOMMANDOCENTRAL
          </p>
          <h1 className="text-[28px] tracking-[0.25em] text-white uppercase">
            {eventName}
          </h1>
          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="text-[12px] tracking-widest text-white/50 uppercase">
              {maxResponders} BEKRÄFTADE OPERATIVES
            </span>
            <button
              onClick={fetchDashboard}
              className="text-[13px] tracking-widest text-white/50 hover:text-white uppercase transition-colors underline underline-offset-4"
            >
              UPPDATERA
            </button>
          </div>
        </div>

        {/* General Invitation Link */}
        <div className="border border-white/20 p-5">
          <h2
            className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1"
          >
            DEPLOYMENT LINK
          </h2>
          <p className="text-[13px] tracking-[0.25em] text-white/40 uppercase font-mono mb-4">
            DELA DENNA LÄNK MED ALLA OPERATIVA. DE REGISTRERAR SINA EGNA NAMN.
          </p>
          <div className="flex items-stretch gap-0">
            <code className="flex-1 bg-white/5 border border-white/15 px-3 py-3 text-[12px] text-white/50 font-mono tracking-wider truncate">
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

        {/* Dashboard Link */}
        <div className="border border-white/10 p-5">
          <h2
            className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-1"
          >
            DIN KOMMANDOLÄNK
          </h2>
          <p className="text-[13px] tracking-[0.25em] text-white/40 uppercase font-mono mb-4">
            BOKMÄRK DENNA LÄNK. UTAN DEN FÖRLORAR DU ÅTKOMST.
          </p>
          <div className="flex items-stretch gap-0">
            <code className="flex-1 bg-white/3 border border-white/10 px-3 py-3 text-[12px] text-white/50 font-mono tracking-wider truncate">
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

        {/* Registered operatives */}
        {friends.length > 0 && (
          <div className="border border-white/10 p-5">
            <h2
              className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-4"
            >
              REGISTRERADE OPERATIVA ({friends.length})
            </h2>
            <div className="space-y-px">
              {friends.map((f, i) => (
                <div key={f.id} className="flex items-center gap-4 py-2 border-b border-white/5">
                  <span className="text-[13px] font-mono text-white/40 w-5 text-right shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs tracking-[0.2em] text-white/50 uppercase font-mono">
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[13px] tracking-[0.4em] text-white/50 uppercase"
            >
              INTEL RAPPORT // TILLGÄNGLIGHET
            </h2>
          </div>

          {dates.length === 0 ? (
            <p className="text-white/40 text-[12px] tracking-widest uppercase font-mono text-center py-8 border border-white/10">
              INGA SVAR ÄNNU
            </p>
          ) : (
            <div className="space-y-px">
              {sortedDates.map((d, i) => {
                const count = d.availableFriends.length;
                const pct = maxResponders > 0 ? (count / maxResponders) * 100 : 0;
                const isTop = i === 0 && count > 0;
                return (
                  <div
                    key={d.id}
                    className={`border px-5 py-4 ${isTop ? "border-white bg-white/5" : "border-white/15"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <span className={`text-[12px] font-mono shrink-0 w-5 text-right mt-0.5
                          ${isTop ? "text-white/50" : "text-white/40"}`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[13px] tracking-[0.15em] uppercase font-mono
                            ${isTop ? "text-white" : "text-white/50"}`}
                          >
                            {formatDateLabel(d.date)}
                          </p>
                          {d.availableFriends.length > 0 ? (
                            <p className="text-[13px] tracking-widest text-white/50 uppercase font-mono mt-1">
                              {d.availableFriends.join(" // ")}
                            </p>
                          ) : (
                            <p className="text-[13px] tracking-widest text-white/15 uppercase font-mono mt-1 italic">
                              INGA SVAR
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-2xl font-bold tracking-tight
                          ${isTop ? "text-white" : "text-white/50"}`}
                        >
                          {count}
                        </span>
                        <span className="text-[12px] text-white/40 font-mono">
                          /{maxResponders}
                        </span>
                      </div>
                    </div>

                    {maxResponders > 0 && (
                      <div className="mt-3 h-px bg-white/10">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[13px] tracking-[0.3em] text-white/10 uppercase font-mono text-center pb-4">
          RSA SER ALLT // KLASSIFICERAT // {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
