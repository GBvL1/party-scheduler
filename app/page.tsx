"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlitchText } from "./components/GlitchText";

const FIXED_DATES = [
  "2026-06-07",
  "2026-06-14",
  "2026-07-12",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
];

export default function HomePage() {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 40);
    return () => clearTimeout(t);
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "RSA INITIERING", dates: FIXED_DATES }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "SYSTEM FAILURE.");
        setLoading(false);
        return;
      }
      router.push(`/dashboard/${data.hostToken}`);
    } catch {
      setError("NETWORK FAILURE. RETRY OPERATION.");
      setLoading(false);
    }
  }

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center px-6 py-16 ${booted ? "crt-boot" : "opacity-0"}`}
    >
      <div className="w-full max-w-xl text-center flicker">

        {/* RSA Logo */}
        <div className="mb-6 select-none">
          <div
            className="logo-rsa text-[clamp(100px,22vw,160px)] leading-none tracking-tight text-white block"
            data-text="RSA"
          >
            RSA
          </div>
          <div className="text-[clamp(15px,3vw,22px)] tracking-[0.45em] text-white uppercase mt-3">
            {booted && <GlitchText text="RSA SER ALLT" delay={400} speed={35} />}
          </div>
        </div>

        {/* Rule */}
        <div className="w-full h-px bg-white/25 my-8" />

        {/* Title block */}
        <p className="text-[12px] tracking-[0.4em] text-white/50 uppercase mb-3">
          KLASSIFICERAT // BEHÖRIG PERSONAL ONLY
        </p>
        <h1 className="text-[clamp(28px,6vw,48px)] tracking-[0.35em] text-white uppercase mb-3">
          {booted && <GlitchText text="INITIERING" delay={700} speed={30} />}
        </h1>
        <p className="text-[12px] tracking-[0.3em] text-white/40 uppercase mb-10">
          OPERATION ID: RSA-2026 // FIELD COMMANDER ACCESS
        </p>

        {error && (
          <p className="text-red-400 text-[12px] tracking-widest mb-6 border border-red-800 px-4 py-3 bg-red-950/30">
            [SYSTEM ERROR] {error}
          </p>
        )}

        <button
          onClick={initialize}
          disabled={loading}
          className="btn-rsa relative border-2 border-white text-white uppercase tracking-[0.4em] px-14 py-4 font-bold hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: "15px" }}
        >
          {loading ? (
            <span className="flex items-center gap-3">
              INITIERAR<span className="cursor-blink">_</span>
            </span>
          ) : (
            "INITIERA OPERATION"
          )}
        </button>

        <p className="mt-10 text-[11px] tracking-[0.35em] text-white/20 uppercase">
          DEPLOYMENT WINDOW: JUNI &ndash; JULI 2026 // 14 DATUM LADDADE
        </p>
      </div>
    </main>
  );
}
