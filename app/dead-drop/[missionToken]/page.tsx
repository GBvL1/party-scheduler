"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { playBlip, playClick } from "@/lib/sound";

function formatDateFull(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("sv-SE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

export default function DeadDropPage() {
  const { missionToken } = useParams<{ missionToken: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockedDate, setLockedDate] = useState("");
  const [missionRef, setMissionRef] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [wiped, setWiped] = useState(false);
  const locationRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mission/${missionToken}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "INTEL EJ TILLGÄNGLIG.");
          setLoading(false);
          return;
        }
        setLockedDate(data.lockedDate);
        setMissionRef(data.missionRef);
        setLocation(data.location ?? null);
        locationRef.current = data.location ?? null;
        setLoading(false);
      } catch {
        setError("NÄTVERKSFEL.");
        setLoading(false);
      }
    }
    load();
  }, [missionToken]);

  // Fade in once data is ready
  useEffect(() => {
    if (loading || error) return;
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [loading, error]);

  // Staggered reveal with a single blip on start
  useEffect(() => {
    if (!visible) return;
    playBlip();
    const loc = locationRef.current;
    const delays = loc
      ? [300, 700, 1100, 1500, 2000, 2400, 2800, 3300, 4000]
      : [300, 700, 1100, 1500, 2000, 2600, 3300];
    const timers = delays.map((d, i) =>
      setTimeout(() => setRevealStep(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  function handleWipe() {
    playClick();
    setWiped(true);
    setTimeout(() => router.push("/"), 600);
  }

  if (wiped) {
    return <div className="fixed inset-0 bg-black" style={{ zIndex: 99999 }} />;
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/25 text-[11px] tracking-[0.5em] uppercase font-mono">
          DEKRYPTERAR SÄNDNING <span className="cursor-blink">_</span>
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-400/50 text-[11px] tracking-[0.5em] uppercase font-mono border border-red-900/30 px-4 py-3">
          [ÅTKOMST NEKAD] {error}
        </p>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen flex flex-col justify-center px-6 py-16 transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="max-w-md mx-auto w-full font-mono">

        {revealStep >= 1 && (
          <p className="text-[10px] tracking-[0.6em] text-white/25 uppercase mb-8">
            RSA // UPPDRAGSORDER // DEKRYPTERAD
          </p>
        )}

        {revealStep >= 2 && (
          <>
            <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase mb-4">
              REF: {missionRef}
            </p>
            <div className="h-px bg-white/10 mb-6" />
          </>
        )}

        {revealStep >= 3 && (
          <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-2">
            SAMLINGSDATUM
          </p>
        )}

        {revealStep >= 4 && (
          <p className="text-[clamp(17px,3.5vw,24px)] tracking-[0.12em] text-white uppercase leading-snug mb-6">
            {formatDateFull(lockedDate)}
          </p>
        )}

        {revealStep >= 5 && location && (
          <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-2 mt-6">
            KOORDINATER
          </p>
        )}

        {revealStep >= 6 && location && (
          <p className="text-[clamp(13px,2.5vw,18px)] tracking-[0.12em] text-white uppercase leading-snug mb-6">
            {location}
          </p>
        )}

        {revealStep >= (location ? 7 : 5) && (
          <>
            <div className="h-px bg-white/10 mb-4" />
            <p className="text-[10px] tracking-[0.45em] text-white/20 uppercase">
              STATUS // UPPDRAG BEKRÄFTAT
            </p>
          </>
        )}

        {revealStep >= (location ? 8 : 6) && (
          <p className="text-[10px] tracking-[0.3em] text-white/12 uppercase leading-relaxed mt-8">
            DETTA DOKUMENT ÄR AVSETT ENBART FÖR MOTTAGAREN.<br />
            RSA FÖRNEKAR ALL KÄNNEDOM OM DESS EXISTENS.
          </p>
        )}

        {revealStep >= (location ? 9 : 7) && (
          <div className="mt-10">
            <button
              onClick={handleWipe}
              className="text-[10px] tracking-[0.45em] text-white/20 hover:text-white/50 uppercase underline underline-offset-4 transition-colors duration-150"
            >
              RADERA LOKAL KOPIA
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
