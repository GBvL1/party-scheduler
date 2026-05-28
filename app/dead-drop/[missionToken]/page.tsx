"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { playBlip } from "@/lib/sound";

function useTypewriter(text: string, active: boolean, speed = 35) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!active || !text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return displayed;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockedDate, setLockedDate] = useState("");
  const [missionRef, setMissionRef] = useState("");
  const [bringItems, setBringItems] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const bringRef = useRef<string[]>([]);

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
        setBringItems(data.bringItems ?? []);
        bringRef.current = data.bringItems ?? [];
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
    const hasBring = bringRef.current.length > 0;
    const delays = hasBring
      ? [300, 700, 1100, 1500, 2000, 2600, 3300]
      : [300, 700, 1100, 1500, 2000, 2600];
    const timers = delays.map((d, i) =>
      setTimeout(() => setRevealStep(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const bringText = bringItems.map((i) => `• ${i}`).join("\n");
  const typedBring = useTypewriter(bringText, revealStep >= 5 && bringItems.length > 0);

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
          <p className="text-[10px] tracking-[0.6em] text-white/45 uppercase mb-8">
            RSA // UPPDRAGSORDER // DEKRYPTERAD
          </p>
        )}

        {revealStep >= 2 && (
          <>
            <p className="text-[10px] tracking-[0.45em] text-white/50 uppercase mb-4">
              REF: {missionRef}
            </p>
            <div className="h-px bg-white/10 mb-6" />
          </>
        )}

        {revealStep >= 3 && (
          <p className="text-[10px] tracking-[0.5em] text-white/50 uppercase mb-2">
            SAMLINGSDATUM
          </p>
        )}

        {revealStep >= 4 && (
          <p className="text-[clamp(17px,3.5vw,24px)] tracking-[0.12em] text-white uppercase leading-snug mb-6">
            {formatDateFull(lockedDate)}
          </p>
        )}

        {revealStep >= 5 && bringItems.length > 0 && (
          <>
            <p className="text-[10px] tracking-[0.5em] text-white/50 uppercase mb-3 mt-6">
              TA MED
            </p>
            <pre className="text-[13px] tracking-[0.1em] text-white uppercase font-mono leading-relaxed mb-6 whitespace-pre-wrap">
              {typedBring}{typedBring.length < bringText.length && <span className="cursor-blink">_</span>}
            </pre>
          </>
        )}

        {revealStep >= (bringItems.length > 0 ? 6 : 5) && (
          <>
            <div className="h-px bg-white/10 mb-4" />
            <p className="text-[10px] tracking-[0.45em] text-white/40 uppercase">
              STATUS // UPPDRAG BEKRÄFTAT
            </p>
          </>
        )}

        {revealStep >= (bringItems.length > 0 ? 7 : 6) && (
          <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase leading-relaxed mt-8">
            DETTA DOKUMENT ÄR AVSETT ENBART FÖR MOTTAGAREN.<br />
            RSA FÖRNEKAR ALL KÄNNEDOM OM DESS EXISTENS.
          </p>
        )}


      </div>
    </main>
  );
}
