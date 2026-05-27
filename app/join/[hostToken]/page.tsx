"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlitchText } from "@/app/components/GlitchText";
import { playClick, playConfirm, playError, playWelcomeBack } from "@/lib/sound";

export default function JoinPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [ambientGlitch, setAmbientGlitch] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!booted) return;
    const id = setInterval(() => {
      if (Math.random() < 0.45) {
        setAmbientGlitch(true);
        setTimeout(() => setAmbientGlitch(false), 500);
      }
    }, 7000);
    return () => clearInterval(id);
  }, [booted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("OPERATIVE NAME REQUIRED."); return; }

    playClick();
    setGlitching(true);
    setTimeout(() => setGlitching(false), 800);

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
        playError();
        setError(data.error || "REGISTRATION FAILED.");
        setLoading(false);
        return;
      }
      if (data.returning) {
        playWelcomeBack();
        setWelcomeBack({ name: data.name });
        setTimeout(() => router.push(`/respond/${data.friendToken}`), 2200);
      } else {
        playConfirm();
        router.push(`/respond/${data.friendToken}`);
      }
    } catch {
      playError();
      setError("NETWORK FAILURE. RETRY.");
      setLoading(false);
    }
  }

  return (
    <>
      <main
        className={`min-h-screen flex flex-col items-center justify-center px-6 py-16
          ${booted ? "crt-boot" : "opacity-0"}
          ${glitching ? "page-glitch-hard" : ""}
        `}
      >
        <div className={ambientGlitch ? "glitch-burst" : ""}>
          <div className="w-full max-w-md flicker">

            {/* RSA Logo — full size matching home page */}
            <div className="mb-6 text-center select-none">
              <div
                className="logo-rsa text-[clamp(80px,18vw,140px)] leading-none tracking-tight text-white block"
                data-text="RSA"
              >
                RSA
              </div>
              <div className="text-[clamp(13px,2.5vw,18px)] tracking-[0.45em] text-white uppercase mt-3">
                {booted && <GlitchText text="RSA SER ALLT" delay={400} speed={35} />}
              </div>
            </div>

            <div className="w-full h-px bg-white/25 my-8" />

            <div className="mb-8 text-center">
              <p className="text-[12px] tracking-[0.4em] text-white/50 uppercase mb-3">
                RSA INITIERING // OPERATIVE REGISTRATION
              </p>
              <h1 className="text-[clamp(24px,5vw,40px)] tracking-[0.3em] text-white uppercase mb-2">
                {booted && <GlitchText text="IDENTIFIERA DIG" delay={700} speed={30} />}
              </h1>
              <p className="text-[12px] text-white/40 tracking-widest uppercase mt-2">
                ANGE DITT NAMN FÖR ATT FORTSÄTTA
              </p>
            </div>

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
                  "RAPPORTERA IN"
                )}
              </button>
            </form>

            <p className="mt-10 text-[11px] tracking-[0.3em] text-white/15 uppercase font-mono text-center">
              RSA INITIERING // JUNE&ndash;JULY 2026
            </p>
          </div>
        </div>
      </main>

      {/* Returning operative overlay */}
      {welcomeBack && (
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
              OPERATIV IGENKÄND // ACCESS GRANTED
            </p>
            <h2 className="text-[clamp(22px,6vw,44px)] tracking-[0.25em] text-white uppercase mb-3">
              <GlitchText text="VÄLKOMMEN TILLBAKA" delay={300} speed={28} />
            </h2>
            <p className="text-[clamp(14px,3vw,22px)] tracking-[0.35em] text-white/60 uppercase font-mono mb-6">
              {welcomeBack.name}
            </p>
            <div className="w-full h-px bg-white/20 mb-6" />
            <p className="text-[12px] tracking-[0.4em] text-white/40 uppercase font-mono">
              OMDIRIGERAR<span className="cursor-blink">_</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
