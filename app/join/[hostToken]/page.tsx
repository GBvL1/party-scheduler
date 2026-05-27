"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 40);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("OPERATIVE NAME REQUIRED."); return; }

    setGlitching(true);
    setTimeout(() => setGlitching(false), 600);

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "REGISTRATION FAILED.");
        setLoading(false);
        return;
      }
      router.push(`/respond/${data.friendToken}`);
    } catch {
      setError("NETWORK FAILURE. RETRY.");
      setLoading(false);
    }
  }

  return (
    <main
      ref={mainRef}
      className={`min-h-screen flex flex-col items-center justify-center px-6 py-16
        ${booted ? "crt-boot" : "opacity-0"}
        ${glitching ? "page-glitch" : ""}
      `}
    >
      <div className="w-full max-w-md flicker">

        {/* Logo mark */}
        <div className="mb-8 text-center select-none">
          <div
            className="logo-rsa text-[72px] leading-none tracking-tight text-white block"
            data-text="RSA"
          >
            RSA
          </div>
          <div
            className="text-[13px] tracking-[0.45em] text-white/60 uppercase mt-1"
          >
            RSA SER ALLT
          </div>
        </div>

        <div className="w-full h-px bg-white/20 mb-8" />

        {/* Heading */}
        <div className="mb-8 text-center">
          <p className="text-[13px] tracking-[0.4em] text-white/50 uppercase mb-2">
            RSA INITIATION // OPERATIVE REGISTRATION
          </p>
          <h1 className="text-[28px] tracking-[0.25em] text-white uppercase">
            IDENTIFIERA DIG
          </h1>
          <p className="text-[13px] text-white/55 tracking-widest uppercase mt-2">
            ANGE DITT NAMN FÖR ATT FORTSÄTTA
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[13px] tracking-[0.35em] text-white/40 uppercase mb-2 text-center">
              OPERATIVE DESIGNATION
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="DITT NAMN"
              autoComplete="off"
              autoFocus
              className="w-full bg-black border-2 border-white/40 focus:border-white text-white placeholder:text-white/40 px-4 py-3 text-sm tracking-widest uppercase text-center outline-none transition-colors duration-100"
            />
          </div>

          {error && (
            <p className="text-red-400 text-[12px] tracking-widest border border-red-800/50 px-3 py-2 bg-red-950/20 text-center">
              [ERR] {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-rsa w-full border-2 border-white text-white uppercase tracking-[0.4em] py-4 text-sm font-bold hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "14px" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                REGISTRERAR <span className="cursor-blink">_</span>
              </span>
            ) : (
              "RAPPORTERA INN"
            )}
          </button>
        </form>

        <p className="mt-8 text-[13px] tracking-[0.3em] text-white/15 uppercase font-mono text-center">
          RSA INITIATION // JUNE&ndash;JULY 2026
        </p>
      </div>
    </main>
  );
}
